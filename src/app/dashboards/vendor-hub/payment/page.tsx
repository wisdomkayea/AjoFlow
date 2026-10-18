"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/types";
import { ChevronDown, Filter, Search, X } from "lucide-react";

interface Payment {
  id: string;
  amount: string;
  paidAt: string;
  method?: "CASH" | "TRANSFER" | "SYSTEM";
  reference?: string | null;
}

interface Installment {
  id: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  repaymentPreview?: {
    repaymentFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    numberOfInstallments: number;
    suggestedInstallmentAmount: number;
  } | null;
  product: { name: string };
  customer: { name: string; email: string };
  payments: Payment[];
}

interface LedgerRow {
  id: string;
  installmentId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  amount: number;
  paidAt: string;
  method: "Transfer" | "Cash" | "System";
  reference: string;
}

type PaymentMethod = "Cash" | "Transfer";

const PAGE_SIZE = 6;

function naira(n: number | string) {
  return `N${Number(n).toLocaleString("en-NG")}`;
}

function referenceSeed(value: string) {
  return value
    .replace(/[^0-9a-z]/gi, "")
    .slice(-8)
    .toUpperCase();
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "CU";
}

function toMethodLabel(method?: "CASH" | "TRANSFER" | "SYSTEM") {
  if (method === "TRANSFER") return "Transfer";
  if (method === "SYSTEM") return "System";
  return "Cash";
}

function VendorPaymentContent() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const [selectedInstallmentId, setSelectedInstallmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [recording, setRecording] = useState(false);

  const { presentError, success } = useNotifier();

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<Installment[]>("/api/installments")
      .then((data) => {
        setInstallments(data);
      })
      .catch((error) => presentError(error, "Could not load payments"))
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(() => {
    load();
  }, [load]);

  const paymentPlans = useMemo(
    () => installments.filter((installment) => Number(installment.balance) > 0),
    [installments],
  );

  useEffect(() => {
    if (!showRecordModal) return;

    if (paymentPlans.length === 0) {
      setSelectedInstallmentId("");
      return;
    }

    setSelectedInstallmentId((current) => {
      if (current && paymentPlans.some((plan) => plan.id === current)) {
        return current;
      }
      return paymentPlans[0].id;
    });
  }, [paymentPlans, showRecordModal]);

  const selectedPlan = useMemo(
    () =>
      paymentPlans.find((plan) => plan.id === selectedInstallmentId) ?? null,
    [paymentPlans, selectedInstallmentId],
  );

  useEffect(() => {
    if (!selectedPlan || !showRecordModal) return;

    const suggested =
      selectedPlan.repaymentPreview?.suggestedInstallmentAmount ??
      Number(selectedPlan.balance);
    setAmount(String(Math.max(1, Math.round(suggested))));
  }, [selectedPlan, showRecordModal]);

  const ledgerRows = useMemo(() => {
    const rows: LedgerRow[] = [];

    for (const installment of installments) {
      const sortedPayments = [...(installment.payments ?? [])].sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      );

      for (let index = 0; index < sortedPayments.length; index += 1) {
        const payment = sortedPayments[index];
        rows.push({
          id: payment.id,
          installmentId: installment.id,
          customerName: installment.customer.name,
          customerEmail: installment.customer.email,
          productName: installment.product.name,
          amount: Number(payment.amount),
          paidAt: payment.paidAt,
          method: toMethodLabel(payment.method),
          reference: payment.reference?.trim() || installment.product.name,
        });
      }
    }

    return rows.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
  }, [installments]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ledgerRows;

    return ledgerRows.filter((row) => {
      return (
        row.customerName.toLowerCase().includes(query) ||
        row.customerEmail.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query) ||
        row.reference.toLowerCase().includes(query)
      );
    });
  }, [ledgerRows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const stats = useMemo(() => {
    const totalCollected = installments.reduce(
      (sum, installment) => sum + Number(installment.amountPaid ?? 0),
      0,
    );
    const paymentsRecorded = ledgerRows.reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const customerSet = new Set(
      installments.map((installment) => installment.customer.email),
    );

    return {
      totalCollected,
      paymentsRecorded,
      totalCustomers: customerSet.size,
    };
  }, [installments, ledgerRows]);

  async function recordPayment() {
    if (!selectedPlan || recording) return;

    const paymentAmount = Number(amount || 0);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      presentError(
        new Error("Amount must be greater than 0"),
        "Invalid amount",
      );
      return;
    }

    setRecording(true);
    try {
      await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          installmentId: selectedPlan.id,
          amount: paymentAmount,
          date,
          method,
          reference: selectedPlan.product.name,
        }),
      });

      success("Payment recorded successfully.");
      setShowRecordModal(false);
      load();
    } catch (error) {
      presentError(error, "Could not record payment");
    } finally {
      setRecording(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment"
        subtitle="Every amount a customer has paid toward a plan"
        actions={
          <Button
            size="sm"
            className="h-10 rounded-lg px-4"
            onClick={() => setShowRecordModal(true)}
          >
            + Record Payment
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-line p-4">
            <p className="text-sm text-ink/50">Total Collected</p>
            <p className="mt-1 text-3xl font-semibold text-ink">
              {naira(stats.totalCollected)}
            </p>
          </div>
          <div className="rounded-lg border border-line p-4">
            <p className="text-sm text-ink/50">Payments Recorded</p>
            <p className="mt-1 text-3xl font-semibold text-ink">
              {naira(stats.paymentsRecorded)}
            </p>
          </div>
          <div className="rounded-lg border border-line p-4">
            <p className="text-sm text-ink/50">Total Customers</p>
            <p className="mt-1 text-3xl font-semibold text-ink">
              {stats.totalCustomers}
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-line/90">
        <CardBody className="p-0">
          <div className="border-b border-line bg-white px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-semibold text-ink">
                  All Customers
                </h3>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {filteredRows.length} users
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg pl-9"
                  placeholder="Search name or phone"
                />
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm text-ink/65"
              >
                <Filter className="h-4 w-4" /> Filters
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm text-ink/65"
              >
                Sort by: Popular <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-line bg-canvas/50 text-xs text-ink/55">
                  <th className="px-4 py-3 font-medium sm:px-5">Customer</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <tr key={`sk-${index}`} className="border-b border-line">
                      <td className="px-4 py-4 sm:px-5">
                        <Skeleton className="h-8 w-40" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                    </tr>
                  ))}

                {!loading && paginatedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-ink/50 sm:px-5"
                    >
                      No payment records found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  paginatedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-line text-sm text-ink/85"
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-200 text-xs font-semibold text-forest-700">
                            {initials(row.customerName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">
                              {row.customerName}
                            </p>
                            <p className="truncate text-xs text-ink/45">
                              {row.customerEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {row.productName}
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {naira(row.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {new Date(row.paidAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">{row.method}</td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {row.reference || referenceSeed(row.id)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <p className="text-sm text-ink/60">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {showRecordModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-white shadow-card">
            <div className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="text-2xl font-semibold text-ink">
                  Record Payment
                </h3>
                <p className="text-sm text-ink/55">
                  Log money a customer has paid toward a plan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="rounded-full border border-line p-1 text-ink/50 hover:bg-canvas/40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Payment Plan
                </label>
                <div className="relative">
                  <select
                    value={selectedInstallmentId}
                    onChange={(event) =>
                      setSelectedInstallmentId(event.target.value)
                    }
                    className="h-11 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                  >
                    {paymentPlans.length === 0 && (
                      <option value="">No active plans</option>
                    )}
                    {paymentPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.customer.name} - {plan.product.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                </div>
              </div>

              <div className="rounded-md bg-forest-50/70 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink/60">Remaining</span>
                  <span className="font-semibold text-ink">
                    {naira(selectedPlan?.balance ?? 0)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-ink/60">Suggested Installment</span>
                  <span className="font-semibold text-ink">
                    {naira(
                      selectedPlan?.repaymentPreview
                        ?.suggestedInstallmentAmount ??
                        selectedPlan?.balance ??
                        0,
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Amount (Naira)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Method
                </label>
                <div className="relative">
                  <select
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as PaymentMethod)
                    }
                    className="h-11 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <Button
                variant="secondary"
                onClick={() => setShowRecordModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={recordPayment}
                disabled={
                  recording || !selectedPlan || paymentPlans.length === 0
                }
              >
                {recording ? "Recording..." : "Record"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NonVendorFallback() {
  return (
    <Card className="p-6">
      <p className="text-sm text-ink/55">
        This page is available to vendor accounts.
      </p>
    </Card>
  );
}

export default function VendorPaymentPage() {
  return (
    <DashboardShell>
      {(session: SessionUser) =>
        session.role === "VENDOR" ? (
          <VendorPaymentContent />
        ) : (
          <NonVendorFallback />
        )
      }
    </DashboardShell>
  );
}
