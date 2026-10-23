"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/types";
import {
  Check,
  ChevronDown,
  CirclePlus,
  Filter,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";

interface Payment {
  id: string;
  amount: string;
  paidAt: string;
  method?: "CASH" | "TRANSFER" | "SYSTEM";
  source?: "MANUAL" | "AUTO";
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
  planLabel: string;
  installmentAmount: number;
  amountRecorded: number;
  source: "Manual" | "Auto";
  paidAt: string;
  method: "Transfer" | "Cash" | "System";
  reference: string;
}

interface RecordPaymentResponse {
  payment: {
    id: string;
  };
}

interface CustomerOption {
  key: string;
  label: string;
  installment: Installment;
}

type PaymentMethod = "Cash" | "Transfer";
type PageMode = "overview" | "record";

const PAGE_SIZE = 6;

function naira(n: number | string) {
  return `N${Number(n).toLocaleString("en-NG")}`;
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

function toPaymentSource(
  source?: "MANUAL" | "AUTO",
  method?: "CASH" | "TRANSFER" | "SYSTEM",
) {
  if (source === "AUTO") return "Auto";
  if (source === "MANUAL") return "Manual";
  return method === "SYSTEM" ? "Auto" : "Manual";
}

function toDisplayReference(
  paymentId: string,
  reference: string | null | undefined,
  productName: string,
) {
  const fallback = `KRD-${paymentId.replace(/[^0-9a-z]/gi, "").slice(-8).toUpperCase()}`;
  const trimmed = reference?.trim();
  if (!trimmed) return fallback;
  if (trimmed.toLowerCase() === productName.trim().toLowerCase()) {
    return fallback;
  }
  return trimmed;
}

function durationLabel(
  repaymentFrequency?: "DAILY" | "WEEKLY" | "MONTHLY",
  count?: number,
) {
  if (!repaymentFrequency || !count) return "-";
  if (repaymentFrequency === "DAILY") {
    return `${count} Days Installment`;
  }
  if (repaymentFrequency === "WEEKLY") {
    return `${count} Weeks Installment`;
  }
  return `${count} Months Installment`;
}

function shortPlanLabel(
  repaymentFrequency?: "DAILY" | "WEEKLY" | "MONTHLY",
  count?: number,
) {
  if (!repaymentFrequency) return "Installment Plan";
  if (repaymentFrequency === "DAILY") return "Daily Installment";
  if (repaymentFrequency === "WEEKLY") {
    if (count && count > 1) return "Bi-weekly Installment";
    return "Weekly Installment";
  }
  return "Monthly Installment";
}

function friendlyDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function VendorPaymentContent() {
  const router = useRouter();
  const { presentError, success } = useNotifier();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageMode, setPageMode] = useState<PageMode>("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedCustomerKey, setSelectedCustomerKey] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("Transfer");
  const [reference, setReference] = useState("");
  const [attachedSlip, setAttachedSlip] = useState("");
  const [recording, setRecording] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastRecordedPaymentId, setLastRecordedPaymentId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<Installment[]>("/api/installments")
      .then((data) => setInstallments(data))
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

  const customerOptions = useMemo(() => {
    const byCustomer = new Map<string, Installment>();
    for (const plan of paymentPlans) {
      const key = plan.customer.email.toLowerCase();
      const existing = byCustomer.get(key);
      if (!existing) {
        byCustomer.set(key, plan);
        continue;
      }
      if (Number(plan.balance) > Number(existing.balance)) {
        byCustomer.set(key, plan);
      }
    }

    return Array.from(byCustomer.entries())
      .map(([key, installment]) => {
        return {
          key,
          label: installment.customer.name,
          installment,
        } satisfies CustomerOption;
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [paymentPlans]);

  useEffect(() => {
    if (pageMode !== "record") return;
    if (customerOptions.length === 0) {
      setSelectedCustomerKey("");
      return;
    }
    setSelectedCustomerKey((current) => {
      if (current && customerOptions.some((entry) => entry.key === current)) {
        return current;
      }
      return customerOptions[0].key;
    });
  }, [customerOptions, pageMode]);

  const selectedCustomer = useMemo(
    () => customerOptions.find((entry) => entry.key === selectedCustomerKey) ?? null,
    [customerOptions, selectedCustomerKey],
  );

  const selectedPlan = selectedCustomer?.installment ?? null;

  useEffect(() => {
    if (!selectedPlan || pageMode !== "record") return;
    const suggested =
      selectedPlan.repaymentPreview?.suggestedInstallmentAmount ??
      Number(selectedPlan.balance);
    setAmount(String(Math.max(1, Math.round(suggested))));
    setReference((current) => current || `${selectedPlan.id.slice(-8).toUpperCase()}-LAG`);
  }, [selectedPlan, pageMode]);

  const ledgerRows = useMemo(() => {
    const rows: LedgerRow[] = [];
    for (const installment of installments) {
      const sortedPayments = [...(installment.payments ?? [])].sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      );
      for (const payment of sortedPayments) {
        rows.push({
          id: payment.id,
          installmentId: installment.id,
          customerName: installment.customer.name,
          customerEmail: installment.customer.email,
          productName: installment.product.name,
          planLabel: shortPlanLabel(
            installment.repaymentPreview?.repaymentFrequency,
            installment.repaymentPreview?.numberOfInstallments,
          ),
          installmentAmount: Number(installment.totalAmount),
          amountRecorded: Number(payment.amount),
          source: toPaymentSource(payment.source, payment.method),
          paidAt: payment.paidAt,
          method: toMethodLabel(payment.method),
          reference: toDisplayReference(
            payment.id,
            payment.reference,
            installment.product.name,
          ),
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
    const paymentsRecorded = ledgerRows.reduce(
      (sum, row) => sum + Number(row.amountRecorded ?? 0),
      0,
    );
    const customerSet = new Set(
      installments.map((installment) => installment.customer.email.toLowerCase()),
    );
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const month = now.getMonth();
    const year = now.getFullYear();

    const receivedToday = ledgerRows.reduce((sum, row) => {
      const paidAt = new Date(row.paidAt);
      const paidAtKey = `${paidAt.getFullYear()}-${paidAt.getMonth()}-${paidAt.getDate()}`;
      return paidAtKey === todayKey ? sum + Number(row.amountRecorded ?? 0) : sum;
    }, 0);

    const receivedThisMonth = ledgerRows.reduce((sum, row) => {
      const paidAt = new Date(row.paidAt);
      const sameMonth = paidAt.getMonth() === month && paidAt.getFullYear() === year;
      return sameMonth ? sum + Number(row.amountRecorded ?? 0) : sum;
    }, 0);

    return {
      receivedToday,
      receivedThisMonth,
      paymentsRecorded,
      totalCustomers: customerSet.size,
    };
  }, [installments, ledgerRows]);

  function handleSwitchToRecord() {
    setPageMode("record");
    setShowSuccessModal(false);
  }

  function clearRecordEntry() {
    if (!selectedPlan) {
      setAmount("");
      setReference("");
      setAttachedSlip("");
      setDate(new Date().toISOString().slice(0, 10));
      setMethod("Transfer");
      return;
    }
    const suggested =
      selectedPlan.repaymentPreview?.suggestedInstallmentAmount ??
      Number(selectedPlan.balance);
    setAmount(String(Math.max(1, Math.round(suggested))));
    setReference(`${selectedPlan.id.slice(-8).toUpperCase()}-LAG`);
    setAttachedSlip("");
    setDate(new Date().toISOString().slice(0, 10));
    setMethod("Transfer");
  }

  async function copyPortalLink() {
    if (!selectedPlan) return;
    const link = `${window.location.origin}/customer-portal/${selectedPlan.id}`;
    try {
      await navigator.clipboard.writeText(link);
      success("Customer portal link copied.");
    } catch (error) {
      presentError(error, "Could not copy portal link");
    }
  }

  async function recordPayment() {
    if (!selectedPlan || recording) return;
    const paymentAmount = Number(amount || 0);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      presentError(new Error("Amount must be greater than 0"), "Invalid amount");
      return;
    }

    setRecording(true);
    try {
      const result = await apiFetch<RecordPaymentResponse>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          installmentId: selectedPlan.id,
          amount: paymentAmount,
          date,
          method,
          reference,
        }),
      });

      setLastRecordedPaymentId(result.payment.id);
      setShowSuccessModal(true);
      success("Payment recorded successfully.");
      load();
    } catch (error) {
      presentError(error, "Could not record payment");
    } finally {
      setRecording(false);
    }
  }

  if (pageMode === "record") {
    return (
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/55">
          <button
            type="button"
            onClick={() => setPageMode("overview")}
            className="hover:text-ink"
          >
            ← Payments
          </button>{" "}
          / Record a Transaction
        </div>

        <Card className="rounded-2xl border border-line bg-white">
          <CardBody className="space-y-5 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-forest-900 text-white">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[20px] font-bold leading-7 text-ink">
                  Record Customer Payment
                </h2>
                <p className="text-[12px] leading-4 text-ink/55">
                  Direct ledger credit with automatic WhatsApp transaction
                  receipt generation
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[14px] font-semibold leading-5 text-ink">
                Select Customer
              </label>
              <div className="relative">
                <select
                  value={selectedCustomerKey}
                  onChange={(event) => setSelectedCustomerKey(event.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-line bg-white px-3 pr-10 text-[14px] leading-5 text-ink focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  {customerOptions.length === 0 && (
                    <option value="">No active customers with outstanding plans</option>
                  )}
                  {customerOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
              </div>
            </div>

            {selectedPlan && (
              <div className="rounded-lg bg-primary-50 px-3.5 py-3 text-[14px] text-ink/80">
                <div className="flex items-center justify-between">
                  <span>Balance</span>
                  <span className="font-semibold text-ink">
                    {naira(selectedPlan.balance)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Next Payment</span>
                  <span className="font-semibold text-ink">
                    {naira(
                      selectedPlan.repaymentPreview?.suggestedInstallmentAmount ?? 0,
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>Payment Duration</span>
                  <span className="font-medium text-ink">
                    {durationLabel(
                      selectedPlan.repaymentPreview?.repaymentFrequency,
                      selectedPlan.repaymentPreview?.numberOfInstallments,
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-ink/55">
                  Amount Received (NGN)
                </label>
                <div className="flex h-10 items-center rounded-md border border-line bg-white px-3">
                  <span className="pr-2 font-semibold text-primary-700">₦</span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full border-none bg-transparent text-[20px] font-semibold leading-7 text-ink outline-none"
                  />
                </div>
                <p className="mt-1 text-[12px] text-ink/55">
                  Target: {selectedPlan?.product.name ?? "-"} (Overdue Balance:{" "}
                  {naira(selectedPlan?.balance ?? 0)})
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-ink/55">
                  Payment Channel
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("Transfer")}
                    className={`flex h-10 items-center gap-2 rounded-md border px-3 text-[14px] ${
                      method === "Transfer"
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-line bg-white text-ink/75"
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full border ${
                        method === "Transfer"
                          ? "border-primary-600 bg-primary-600"
                          : "border-ink/35"
                      }`}
                    />
                    Bank Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("Cash")}
                    className={`flex h-10 items-center gap-2 rounded-md border px-3 text-[14px] ${
                      method === "Cash"
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-line bg-white text-ink/75"
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full border ${
                        method === "Cash"
                          ? "border-primary-600 bg-primary-600"
                          : "border-ink/35"
                      }`}
                    />
                    Cash
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-ink/55">
                  Session ID / Reference
                </label>
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className="h-10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-ink/55">
                  Payment Execution Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md bg-canvas/60 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-ink/60" />
                <div>
                  <p className="text-[13px] font-medium text-ink/80">
                    Attach Transaction Slip or Bank Teller
                  </p>
                  <p className="text-[11px] text-ink/55">
                    Supported formats: JPG, PNG, PDF up to 5MB
                  </p>
                  {attachedSlip ? (
                    <p className="text-[11px] font-medium text-primary-700">
                      {attachedSlip}
                    </p>
                  ) : null}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setAttachedSlip(file?.name ?? "");
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink/75 hover:bg-canvas"
              >
                Upload Slip
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={clearRecordEntry}
                className="h-10 rounded-md bg-[#F5F0EB] px-4 text-[13px] font-medium text-[#7A6F63]"
              >
                Clear Entry
              </button>
              <Button
                onClick={recordPayment}
                disabled={recording || !selectedPlan || customerOptions.length === 0}
                className="h-10 min-w-[86px] rounded-md bg-[#0B5D2E] px-4 text-[13px] font-medium text-white hover:bg-[#0A4F28]"
              >
                {recording ? "Recording..." : "Record"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {showSuccessModal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-[520px] rounded-2xl bg-white p-6 text-center shadow-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-[40px] font-bold leading-[44px] text-ink">
                Payment Recorded Successfully
              </h3>
              <p className="mt-2 text-[13px] leading-5 text-ink/55">
                You have successfully recorded {naira(amount || 0)} payment for{" "}
                {selectedPlan?.customer.name ?? "customer"}.
              </p>

              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (lastRecordedPaymentId) {
                      router.push(`/dashboards/vendor-hub/payment/${lastRecordedPaymentId}`);
                    }
                  }}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white"
                >
                  View Plan
                </button>
                <button
                  type="button"
                  onClick={copyPortalLink}
                  className="rounded-lg bg-primary-50 px-4 py-2 text-[13px] font-semibold text-primary-700"
                >
                  Generate customer portal link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold leading-8 text-gray-900">
            Payments
          </h1>
          <p className="text-sm font-normal leading-5 text-gray-500">
            Record money received from a customer.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSwitchToRecord}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
        >
          <CirclePlus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-[10px] border border-gray-200 bg-white p-3">
            <p className="text-[12px] font-medium leading-4 text-gray-400">
              Received Today
            </p>
            <p className="mt-1 text-[24px] font-bold leading-8 text-gray-900">
              {naira(stats.receivedToday)}
            </p>
          </div>
          <div className="rounded-[10px] border border-gray-200 bg-white p-3">
            <p className="text-[12px] font-medium leading-4 text-gray-400">
              Received this Month
            </p>
            <p className="mt-1 text-[24px] font-bold leading-8 text-gray-900">
              {naira(stats.receivedThisMonth)}
            </p>
          </div>
          <div className="rounded-[10px] border border-gray-200 bg-white p-3">
            <p className="text-[12px] font-medium leading-4 text-gray-400">
              Total Payment Recorded
            </p>
            <p className="mt-1 text-[24px] font-bold leading-8 text-gray-900">
              {naira(stats.paymentsRecorded)}
            </p>
          </div>
          <div className="rounded-[10px] border border-gray-200 bg-white p-3">
            <p className="text-[12px] font-medium leading-4 text-gray-400">
              Total Customers
            </p>
            <p className="mt-1 text-[24px] font-bold leading-8 text-gray-900">
              {stats.totalCustomers}
            </p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <CardBody className="p-0">
          <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-semibold leading-7 text-gray-900">
                  All Customers
                </h3>
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[12px] font-semibold text-primary-700">
                  {filteredRows.length} users
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
                <div className="relative min-w-[220px] flex-1 sm:min-w-[280px] xl:w-[280px] xl:min-w-[280px] xl:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-[10px] border-gray-200 bg-gray-50 pl-9 text-sm text-gray-700 focus:border-primary-600 focus:ring-green-100"
                    placeholder="Search name or phone"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700"
                >
                  <Filter className="h-4 w-4" /> Filters
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700"
                >
                  Sort by:{" "}
                  <span className="font-semibold text-primary-700">Popular</span>{" "}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[12px] text-gray-500">
                  <th className="px-4 py-3 font-medium sm:px-5">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Linked Plan/Product</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Amount Recorded</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <tr key={`sk-${index}`} className="border-b border-gray-200">
                      <td className="px-4 py-4 sm:px-5">
                        <Skeleton className="h-8 w-40" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-32" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                    </tr>
                  ))}

                {!loading && paginatedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-gray-500 sm:px-5"
                    >
                      No payment records found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  paginatedRows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-gray-200 text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() => router.push(`/dashboards/vendor-hub/payment/${row.id}`)}
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-primary-600">
                            {initials(row.customerName)}
                          </div>
                          <p className="truncate font-medium text-gray-900">{row.customerName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {friendlyDate(row.paidAt)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        <p>{row.productName}</p>
                        <p className="text-xs text-gray-500">{row.planLabel}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {naira(row.installmentAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {naira(row.amountRecorded)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {row.source}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">{row.reference}</td>
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
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
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
        session.role === "VENDOR" ? <VendorPaymentContent /> : <NonVendorFallback />
      }
    </DashboardShell>
  );
}
