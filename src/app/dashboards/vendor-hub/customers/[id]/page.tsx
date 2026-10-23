"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/formatters";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CirclePlus,
  Landmark,
  Phone,
  Receipt,
  Wallet,
  X,
} from "lucide-react";

interface InstallmentRow {
  id: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  createdAt: string;
  product: { name: string };
  customer: { id: string; name: string; email: string };
  payments: Array<{
    id: string;
    amount: string;
    paidAt: string;
    method?: "CASH" | "TRANSFER" | "SYSTEM" | "Cash" | "Transfer";
    source?: "MANUAL" | "AUTO";
    reference?: string | null;
  }>;
  repaymentPreview?: {
    repaymentFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    numberOfInstallments: number;
    suggestedInstallmentAmount: number;
    startDate: string;
  } | null;
}

interface CustomerDirectoryUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER";
}

interface StatsItem {
  label: string;
  value: string;
  icon: typeof Landmark;
}

function planCode(id: string) {
  return `PLN-${id.replace(/[^0-9a-z]/gi, "").slice(-4).toUpperCase()}`;
}

function mapFrequencyLabel(frequency: "DAILY" | "WEEKLY" | "MONTHLY" | undefined) {
  if (frequency === "DAILY") return "daily";
  if (frequency === "WEEKLY") return "weekly";
  return "monthly";
}

function roundPaidSegments(installment: InstallmentRow) {
  const total = Number(installment.totalAmount ?? 0);
  const paid = Number(installment.amountPaid ?? 0);
  const count = installment.repaymentPreview?.numberOfInstallments ?? 10;
  if (count <= 0 || total <= 0) return 0;
  return Math.max(0, Math.min(count, Math.round((paid / total) * count)));
}

function nextDueLabel(installment: InstallmentRow) {
  const amount = installment.repaymentPreview?.suggestedInstallmentAmount ?? 0;
  const rawDate = installment.repaymentPreview?.startDate ?? installment.createdAt;
  return `${formatMoney(amount).replace("₦", "₦ ")} on ${formatDate(rawDate, { month: "short" })}`;
}

function paymentMethodLabel(
  method?: "CASH" | "TRANSFER" | "SYSTEM" | "Cash" | "Transfer",
) {
  if (method === "TRANSFER" || method === "Transfer") return "Bank Transfer";
  if (method === "SYSTEM") return "System";
  return "Cash";
}

function paymentSourceLabel(
  source?: "MANUAL" | "AUTO",
  method?: "CASH" | "TRANSFER" | "SYSTEM" | "Cash" | "Transfer",
) {
  if (source === "AUTO") return "Auto";
  if (source === "MANUAL") return "Manual";
  return method === "SYSTEM" ? "Auto" : "Manual";
}

function MetricCard({ label, value, icon: Icon }: StatsItem) {
  return (
    <Card className="rounded-2xl border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-normal leading-4 text-gray-500">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-gray-700">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="ledger-figure mt-3 text-[24px] font-bold leading-7 text-gray-900">
        {value}
      </p>
    </Card>
  );
}

function RecordPaymentModal({
  installments,
  onClose,
  onDone,
}: {
  installments: InstallmentRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [installmentId, setInstallmentId] = useState(installments[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"Cash" | "Transfer">("Cash");
  const [saving, setSaving] = useState(false);
  const { presentError, success } = useNotifier();

  const selectedPlan = useMemo(
    () => installments.find((row) => row.id === installmentId) ?? null,
    [installmentId, installments],
  );

  async function recordPayment() {
    if (!selectedPlan || saving || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          installmentId: selectedPlan.id,
          amount: Number(amount),
          date,
          method,
        }),
      });
      success("Payment recorded successfully.");
      onDone();
      onClose();
    } catch (error) {
      presentError(error, "Could not record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-10">
      <div className="w-full max-w-[620px] rounded-[14px] border border-gray-200 bg-white p-4 shadow-card">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[28px] font-semibold leading-9 text-gray-900">Record Payment</h3>
            <p className="text-sm font-normal leading-5 text-gray-500">
              Log money a customer has paid toward a plan
            </p>
          </div>
          <button
            type="button"
            aria-label="Close record payment modal"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Payment Plan
            </label>
            <select
              value={installmentId}
              onChange={(event) => setInstallmentId(event.target.value)}
              className="h-11 w-full rounded-[10px] border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
            >
              {installments.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.customer.name} - {plan.product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 rounded-[10px] bg-green-50 p-3 text-sm sm:grid-cols-2">
            <p className="text-gray-600">
              Balance
              <span className="ml-2 font-semibold text-gray-900">
                {selectedPlan
                  ? formatMoney(selectedPlan.balance).replace("₦", "₦ ")
                  : "-"}
              </span>
            </p>
            <p className="text-gray-600">
              Next Payment
              <span className="ml-2 font-semibold text-gray-900">
                {selectedPlan
                  ? formatMoney(
                      selectedPlan.repaymentPreview?.suggestedInstallmentAmount ?? 0,
                    ).replace("₦", "₦ ")
                  : "-"}
              </span>
            </p>
            <p className="text-gray-600 sm:col-span-2">
              Payment Duration
              <span className="ml-2 font-semibold text-gray-900">
                {selectedPlan
                  ? `${selectedPlan.repaymentPreview?.numberOfInstallments ?? 0} ${mapFrequencyLabel(
                      selectedPlan.repaymentPreview?.repaymentFrequency,
                    )} installments`
                  : "-"}
              </span>
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Amount (Naira)
            </label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 w-full rounded-[10px] border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
              placeholder="50,000"
              type="number"
              min={1}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Date</label>
            <input
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 w-full rounded-[10px] border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
              type="date"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Method
            </label>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value as "Cash" | "Transfer")}
              className="h-11 w-full rounded-[10px] border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="Cash">Cash</option>
              <option value="Transfer">Transfer</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-[10px] border border-[#E0B84E] bg-white text-sm font-semibold text-[#B45309]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={recordPayment}
            disabled={saving || Number(amount) <= 0}
            className="h-11 rounded-[10px] bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const customerId = params.id;

  const [allInstallments, setAllInstallments] = useState<InstallmentRow[]>([]);
  const [directoryCustomers, setDirectoryCustomers] = useState<CustomerDirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const { presentError } = useNotifier();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch<InstallmentRow[]>("/api/installments"),
      apiFetch<CustomerDirectoryUser[]>("/api/users?role=CUSTOMER"),
    ])
      .then(([installments, customers]) => {
        setAllInstallments(installments);
        setDirectoryCustomers(customers);
      })
      .catch((error) => {
        presentError(error, "Could not load customer details");
      })
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(() => {
    load();
  }, [load]);

  const customerInstallments = useMemo(
    () => allInstallments.filter((row) => row.customer.id === customerId),
    [allInstallments, customerId],
  );

  const activeInstallments = useMemo(
    () => customerInstallments.filter((row) => Number(row.balance ?? 0) > 0),
    [customerInstallments],
  );

  const customer = useMemo(() => {
    const fromInstallment = customerInstallments[0]?.customer;
    if (fromInstallment) {
      return {
        name: fromInstallment.name,
        email: fromInstallment.email,
      };
    }

    const fromDirectory = directoryCustomers.find((row) => row.id === customerId);
    if (fromDirectory) {
      return { name: fromDirectory.name, email: fromDirectory.email };
    }

    return {
      name: searchParams.get("name") ?? "Customer",
      email: searchParams.get("email") ?? "-",
    };
  }, [customerInstallments, directoryCustomers, customerId, searchParams]);

  const phone = searchParams.get("phone") ?? "No phone";

  const stats = useMemo(() => {
    const totalPurchased = customerInstallments.reduce(
      (sum, row) => sum + Number(row.totalAmount ?? 0),
      0,
    );
    const totalPaid = customerInstallments.reduce(
      (sum, row) => sum + Number(row.amountPaid ?? 0),
      0,
    );
    const outstanding = Math.max(0, totalPurchased - totalPaid);
    const activePlans = customerInstallments.filter((row) => Number(row.balance ?? 0) > 0).length;

    return [
      { label: "Active Plans", value: String(activePlans), icon: Landmark },
      {
        label: "Total Purchased",
        value: formatMoney(totalPurchased).replace("₦", "₦ "),
        icon: Receipt,
      },
      { label: "Total Paid", value: formatMoney(totalPaid).replace("₦", "₦ "), icon: Wallet },
      {
        label: "Outstanding Balance",
        value: formatMoney(outstanding).replace("₦", "₦ "),
        icon: CheckCircle2,
      },
    ] satisfies StatsItem[];
  }, [customerInstallments]);

  const recentPayments = useMemo(() => {
    return customerInstallments
      .flatMap((installment) =>
        installment.payments.map((payment) => ({
          ...payment,
          productName: installment.product.name,
          planId: installment.id,
        })),
      )
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .slice(0, 3);
  }, [customerInstallments]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const hasPlans = customerInstallments.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-xs font-normal text-gray-500">
        <Link href="/dashboards/vendor-hub/customers" className="hover:underline">
          Customers
        </Link>{" "}
        › <span className="font-semibold text-gray-700">{customer.name}</span>
      </div>

      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-lg font-semibold text-primary-700">
              {customer.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-[24px] font-medium leading-7 tracking-normal text-gray-900">
                {customer.name}
              </h1>
              <p className="text-sm font-normal leading-5 text-gray-500">
                {customer.email} <Phone className="mx-2 inline h-3 w-3" /> {phone}
              </p>
            </div>
          </div>

          {hasPlans && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecordModal(true)}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
              >
                <CirclePlus className="h-4 w-4" />
                Record Payment
              </button>
              <Link
                href="/dashboards/vendor-hub/installments/create-installment"
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-primary-600 bg-white px-4 text-sm font-semibold text-primary-600 hover:bg-green-50"
              >
                <CirclePlus className="h-4 w-4" />
                Create Installment Plan
              </Link>
            </div>
          )}
        </div>
      </div>

      {!hasPlans ? (
        <div className="flex min-h-[58vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <CalendarDays className="h-10 w-10" />
            </div>
            <h2 className="text-[40px] font-bold leading-[48px] text-gray-900">
              No active plan for {customer.name}
            </h2>
            <p className="mt-1 text-sm font-normal leading-5 text-gray-500">
              Click on the button to set up a plan
            </p>
            <Link
              href="/dashboards/vendor-hub/installments/create-installment"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
            >
              <CirclePlus className="h-4 w-4" />
              Proceed to Set Up Plan
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {stats.map((item) => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>

          <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-[24px] font-semibold leading-7 text-gray-900">
              Active payment plans
            </h2>
            <p className="text-xs font-normal leading-4 text-gray-500">
              Products this customer is currently paying for in installments.
            </p>

            <div className="mt-3 space-y-3">
              {activeInstallments.map((plan) => {
                const segmentCount = plan.repaymentPreview?.numberOfInstallments ?? 10;
                const paidSegments = roundPaidSegments(plan);
                const paidAmount = Number(plan.amountPaid ?? 0);
                const totalAmount = Number(plan.totalAmount ?? 0);
                const paidPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

                return (
                  <div key={plan.id} className="rounded-[12px] border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold leading-5 text-gray-900">
                          {plan.product.name}{" "}
                          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                            ACTIVE
                          </span>
                        </p>
                        <p className="text-xs font-normal leading-4 text-gray-500">
                          {formatMoney(plan.totalAmount).replace("₦", "₦ ")} total •{" "}
                          {(plan.repaymentPreview?.numberOfInstallments ?? 6)}-month{" "}
                          {mapFrequencyLabel(plan.repaymentPreview?.repaymentFrequency)} tenure (Plan #
                          {planCode(plan.id)})
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold leading-5 text-gray-900">
                          {formatMoney(plan.balance).replace("₦", "₦ ")} left
                        </p>
                        <p className="text-xs font-normal leading-4 text-gray-500">
                          {paidSegments} of {segmentCount} paid
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <p>
                        Paid: {formatMoney(paidAmount).replace("₦", "₦ ")} ({paidPct}%)
                      </p>
                      <p>Target: {formatMoney(totalAmount).replace("₦", "₦ ")}</p>
                    </div>

                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: segmentCount }).map((_, index) => (
                        <span
                          key={index}
                          className={`h-2 flex-1 rounded-full ${
                            index < paidSegments ? "bg-primary-600" : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="mt-3 border-t border-gray-200 pt-2 text-xs text-gray-600">
                      <p>
                        <CalendarDays className="mr-1 inline h-3 w-3 text-primary-600" />
                        Next due: {nextDueLabel(plan)}
                      </p>
                      <button
                        type="button"
                        className="mt-2 text-sm font-medium text-primary-600 underline"
                      >
                        View Policy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[24px] font-semibold leading-7 text-gray-900">
                  Recent payments
                </h2>
                <p className="text-xs font-normal leading-4 text-gray-500">
                  Verified receipts credited toward active and concluded schedules.
                </p>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-[#F7F2EA] text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Associated Plan</th>
                    <th className="px-3 py-2">Payment Method</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-200 text-sm text-gray-700">
                      <td className="px-3 py-2">
                        {formatDate(payment.paidAt, { month: "short" })}
                      </td>
                      <td className="ledger-figure px-3 py-2 font-semibold text-gray-900">
                        {formatMoney(payment.amount).replace("₦", "₦ ")}
                      </td>
                      <td className="px-3 py-2">{payment.productName}</td>
                      <td className="px-3 py-2">
                        {paymentMethodLabel(payment.method)}{" "}
                        {payment.reference ? `(${payment.reference})` : ""}
                      </td>
                      <td className="px-3 py-2">
                        {paymentSourceLabel(payment.source, payment.method)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                          PAID
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" className="inline-flex items-center gap-1 text-primary-600 hover:underline">
                          View <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <p>Showing {recentPayments.length} most recent entries</p>
              <Link href="/dashboards/vendor-hub/payment" className="text-sm font-medium text-gray-900 hover:underline">
                View all payments ({recentPayments.length}) →
              </Link>
            </div>
          </Card>
        </>
      )}

      {showRecordModal && activeInstallments.length > 0 && (
        <RecordPaymentModal
          installments={activeInstallments}
          onClose={() => setShowRecordModal(false)}
          onDone={load}
        />
      )}
    </div>
  );
}

export default function VendorCustomerDetailsPage() {
  return <DashboardShell>{() => <CustomerDetailContent />}</DashboardShell>;
}
