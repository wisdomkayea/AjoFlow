"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatTime } from "@/lib/formatters";

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
  product: { id?: string; name: string };
  customer: { name: string; email: string };
  payments: Payment[];
}

function naira(n: number | string) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

function methodLabel(method?: "CASH" | "TRANSFER" | "SYSTEM") {
  if (method === "TRANSFER") return "Bank Transfer";
  if (method === "SYSTEM") return "System";
  return "Cash";
}

function paymentSourceLabel(
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

function initials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "CU";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="ledger-figure mt-3 text-[24px] font-bold leading-7 text-gray-900">
        {value}
      </p>
    </Card>
  );
}

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { presentError } = useNotifier();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Installment[]>("/api/installments")
      .then((data) => setInstallments(data))
      .catch((error) => presentError(error, "Could not load payment details"))
      .finally(() => setLoading(false));
  }, [presentError]);

  const detail = useMemo(() => {
    for (const installment of installments) {
      const payment = installment.payments.find((entry) => entry.id === id);
      if (payment) return { installment, payment };
    }
    return null;
  }, [installments, id]);

  const paymentHistory = useMemo(() => {
    if (!detail) return [];
    return [...detail.installment.payments].sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
  }, [detail]);

  const stats = useMemo(() => {
    if (!detail) {
      return {
        totalBilled: 0,
        totalPaid: 0,
        outstanding: 0,
        paymentsCount: 0,
      };
    }
    return {
      totalBilled: Number(detail.installment.totalAmount),
      totalPaid: Number(detail.installment.amountPaid),
      outstanding: Number(detail.installment.balance),
      paymentsCount: detail.installment.payments.length,
    };
  }, [detail]);

  if (loading) {
    return (
      <DashboardShell>
        {() => (
          <div className="space-y-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </DashboardShell>
    );
  }

  if (!detail) {
    return (
      <DashboardShell>
        {() => (
          <p className="text-sm text-gray-500">Payment detail not found.</p>
        )}
      </DashboardShell>
    );
  }

  const { installment, payment } = detail;

  return (
    <DashboardShell>
      {() => (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
            <Link
              href="/dashboards/vendor-hub/payment"
              className="hover:underline"
            >
              Payments
            </Link>{" "}
            › <span className="text-primary-600">Payment Details</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold text-gray-900">
                Payment Details
              </h1>
              <p className="text-sm text-gray-500">
                Receipt and payment timeline for this recorded transaction
              </p>
            </div>
          </div>

          <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="grid gap-5 md:grid-cols-[1fr,220px]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-200 text-sm font-semibold text-forest-700">
                    {initials(installment.customer.name)}
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold leading-7 text-gray-900">
                      {installment.customer.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {installment.customer.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">PRODUCT</p>
                    <p className="font-medium text-gray-800">
                      {installment.product.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">METHOD</p>
                    <p className="font-medium text-gray-800">
                      {methodLabel(payment.method)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">REFERENCE</p>
                    <p className="font-medium text-gray-800">
                      {toDisplayReference(
                        payment.id,
                        payment.reference,
                        installment.product.name,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">LAST PAYMENT AT</p>
                    <p className="font-medium text-gray-800">
                      {formatDate(payment.paidAt, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {formatTime(payment.paidAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <StatCard label="Total Billed" value={naira(stats.totalBilled)} />
            <StatCard label="Total Paid" value={naira(stats.totalPaid)} />
            <StatCard
              label="Outstanding Balance"
              value={naira(stats.outstanding)}
            />
            <StatCard
              label="Payments Recorded"
              value={String(stats.paymentsCount)}
            />
          </div>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-[18px] font-semibold leading-7 text-gray-900">
                Payment Timeline
              </p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-200 text-sm"
                  >
                    <td className="px-4 py-3.5 text-gray-700">
                      {formatDate(entry.paidAt, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      {naira(entry.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">
                      {methodLabel(entry.method)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">
                      {paymentSourceLabel(entry.source, entry.method)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">
                      {toDisplayReference(
                        entry.id,
                        entry.reference,
                        installment.product.name,
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                        Successful
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
