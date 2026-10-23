"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatMoney, formatTime } from "@/lib/formatters";
import {
  Landmark,
  Receipt,
  HandCoins,
  CheckCircle2,
  Wallet,
  Eye,
} from "lucide-react";
import type { SessionUser } from "@/types";
import Link from "next/link";

interface VendorDashboardData {
  totalCustomers: number;
  totalRevenue: number;
  walletBalance: number;
  outstandingPayments: number;
  analytics: {
    totalInstallments: number;
    activeInstallments: number;
    completedInstallments: number;
    defaultedInstallments: number;
    totalBilled: number;
    totalPaid: number;
    averageTicketSize: number;
    collectionRatePct: number;
    defaultRatePct: number;
    paymentsLast30Days: number;
    newPlansLast30Days: number;
    recentPayments: Array<{
      id: string;
      amount: number;
      paidAt: string;
      customerName: string;
      productName: string;
    }>;
  };
}

function reference(id: string) {
  return `KRD-${id
    .replace(/[^0-9a-z]/gi, "")
    .slice(-5)
    .toUpperCase()
    .padStart(5, "0")}`;
}

function SummaryStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Landmark;
}) {
  return (
    <Card className="rounded-2xl border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-normal leading-4 text-gray-500">{label}</p>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Icon className="h-4 w-4 text-gray-700" />
        </div>
      </div>
      <p className="ledger-figure mt-3 text-[24px] font-bold leading-7 text-gray-900">
        {value}
      </p>
    </Card>
  );
}

function VendorView() {
  const [data, setData] = useState<VendorDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { presentError } = useNotifier();

  useEffect(() => {
    apiFetch<VendorDashboardData>("/api/dashboard")
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((err) => {
        setError("Could not load dashboard data.");
        presentError(err, "Could not load dashboard data");
      });
  }, [presentError]);

  if (!data && !error) return <LoadingBlock />;

  if (!data && error) {
    return (
      <Card className="p-5">
        <p className="text-sm text-ink/60">{error}</p>
      </Card>
    );
  }

  const dashboardData = data as VendorDashboardData;

  const collectionWidth = Math.max(
    0,
    Math.min(100, dashboardData.analytics.collectionRatePct),
  );
  const recentPayments = dashboardData.analytics.recentPayments ?? [];

  return (
    <div className="space-y-6">
      <div className="wallet-pattern relative overflow-hidden rounded-[14px] bg-primary-600 px-8 py-10 text-white">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium leading-5 text-white/80">
                Kreddt Wallet
              </p>
              <p className="ledger-figure text-[32px] font-bold leading-10 tracking-normal">
                {formatMoney(dashboardData.walletBalance, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full bg-white/15 p-1.5 text-white/90"
            aria-label="Toggle wallet balance visibility"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryStat
          label="Total Revenue"
          value={formatMoney(dashboardData.totalRevenue)}
          icon={Landmark}
        />
        <SummaryStat
          label="Total Billed"
          value={formatMoney(dashboardData.analytics.totalBilled)}
          icon={Receipt}
        />
        <SummaryStat
          label="Outstanding Balances"
          value={formatMoney(dashboardData.outstandingPayments)}
          icon={HandCoins}
        />
        <SummaryStat
          label="Completed Installments"
          value={String(dashboardData.analytics.completedInstallments)}
          icon={CheckCircle2}
        />
      </div>

      <Card className="rounded-2xl border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold leading-5 text-gray-900">
              Collection Rate
            </p>
            <p className="mt-1 text-xs font-normal leading-4 text-gray-500">
              {formatMoney(dashboardData.analytics.totalPaid)} paid out of{" "}
              {formatMoney(dashboardData.analytics.totalBilled)} billed
            </p>
          </div>
          <span className="ledger-figure rounded-full bg-green-100 px-3 py-1 text-sm font-semibold leading-5 text-green-700">
            {dashboardData.analytics.collectionRatePct.toFixed(1)}%
          </span>
        </div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-amber-400"
            style={{ width: `${collectionWidth}%` }}
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-gray-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[28px] font-semibold leading-9 text-gray-900">
              Recent Transactions
            </p>
            <p className="text-xs font-normal leading-4 text-gray-500">
              Latest Payments
            </p>
          </div>
          <Link
            href="/dashboards/vendor-hub/payment"
            type="button"
            className="shrink-0 rounded-[10px] border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            View More
          </Link>
        </div>
        <div className="mt-4 divide-y divide-gray-200">
          {recentPayments.length === 0 && (
            <p className="py-4 text-sm text-gray-500">
              No payments recorded yet.
            </p>
          )}
          {recentPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-start justify-between gap-3 py-4"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-5 text-gray-900">
                  {payment.customerName} installment payment received for{" "}
                  {payment.productName}
                </p>
                <p className="mt-1 text-[11px] font-normal leading-4 text-gray-500">
                  {formatDate(payment.paidAt, { locale: "en-GB" })} ·{" "}
                  {formatTime(payment.paidAt)} ·{" "}
                  <span className="font-mono">{reference(payment.id)}</span>
                </p>
              </div>
              <span
                className="ledger-figure shrink-0 text-[15px] font-bold leading-5 text-gray-900"
                style={{ fontFamily: "Geist" }}
              >
                {formatMoney(payment.amount).replace("₦", "₦ ")}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-2xl p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-28" />
          </Card>
        ))}
      </div>
      <Card>
        <CardBody className="space-y-3 p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardBody>
      </Card>
    </div>
  );
}

export default function VendorHubDashboardPage() {
  return (
    <DashboardShell>
      {(session: SessionUser) => (
        <div className="space-y-4">
          <div className="space-y-0">
            <h1 className="text-[26px] font-bold leading-[48px] text-gray-900">
              Welcome, {session.name}
            </h1>
            <p className="text-sm font-normal leading-5 text-gray-500">
              Here&apos;s an overview of your vendor activity
            </p>
          </div>
          <VendorView />
        </div>
      )}
    </DashboardShell>
  );
}
