"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { installmentListPathByRole } from "@/lib/role-routes";
import type { SessionUser } from "@/types";

import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api-client";

interface Payment {
  id: string;
  amount: string;
  paidAt: string;
}

interface Installment {
  id: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  repaymentPreview?: {
    estimatedMonthlyPayment: number;
    estimatedCompletionDate: string;
  } | null;
  product: { name: string };
  payments: Payment[];
}

function naira(n: number | string) {
  return `₦${Number(n).toLocaleString("en-NG")}`;
}

function CustomerView({ session }: { session: SessionUser }) {
  const [installments, setInstallments] = useState<Installment[] | null>(null);

  useEffect(() => {
    apiFetch<Installment[]>("/api/installments")
      .then(setInstallments)
      .catch(() => setInstallments([]));
  }, []);

  const summary = useMemo(() => {
    const list = installments ?? [];
    const totalPlans = list.length;
    const activePlans = list.filter((i) => Number(i.balance) > 0).length;
    const completedPlans = list.filter((i) => i.status === "COMPLETED").length;
    const totalPaid = list.reduce((sum, i) => sum + Number(i.amountPaid), 0);
    const outstanding = list.reduce((sum, i) => sum + Number(i.balance), 0);
    const totalBilled = list.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const completionRatePct =
      totalBilled > 0
        ? Math.min(100, Math.max(0, (totalPaid / totalBilled) * 100))
        : 0;
    const monthlyCommitment = list
      .filter((i) => Number(i.balance) > 0)
      .reduce(
        (sum, i) =>
          sum + Number(i.repaymentPreview?.estimatedMonthlyPayment ?? 0),
        0,
      );

    const nextEstimatedCompletion =
      list
        .filter(
          (i) =>
            Number(i.balance) > 0 &&
            i.repaymentPreview?.estimatedCompletionDate,
        )
        .map((i) => new Date(i.repaymentPreview!.estimatedCompletionDate))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const recentPayments = list
      .flatMap((installment) =>
        (installment.payments ?? []).map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          paidAt: payment.paidAt,
          productName: installment.product.name,
        })),
      )
      .sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      )
      .slice(0, 3);

    return {
      totalPlans,
      activePlans,
      completedPlans,
      totalPaid,
      outstanding,
      totalBilled,
      completionRatePct,
      monthlyCommitment,
      nextEstimatedCompletion,
      recentPayments,
    };
  }, [installments]);

  if (!installments) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-24" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-4 w-72" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total plans" value={String(summary.totalPlans)} />
        <StatCard label="Active plans" value={String(summary.activePlans)} />
        <StatCard
          label="Completed plans"
          value={String(summary.completedPlans)}
          accent
        />
        <StatCard label="Outstanding" value={naira(summary.outstanding)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Amount paid" value={naira(summary.totalPaid)} />
        <StatCard
          label="Monthly commitment"
          value={naira(summary.monthlyCommitment)}
        />
        <StatCard
          label="Progress"
          value={`${summary.completionRatePct.toFixed(1)}% complete`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-6">
          <SectionHeader
            title="Account Overview"
            subtitle="Stay on top of your installment obligations with a clear payment trail."
          />
          <CardBody className="space-y-3 px-0 pb-0 pt-4">
            <div className="rounded-lg border border-line bg-canvas/30 p-3 text-xs text-ink/60">
              <p>
                Paid so far:{" "}
                <span className="ledger-figure font-medium text-ink/80">
                  {naira(summary.totalPaid)}
                </span>{" "}
                of{" "}
                <span className="ledger-figure font-medium text-ink/80">
                  {naira(summary.totalBilled)}
                </span>
              </p>
              <p className="mt-1">
                Next estimated completion:{" "}
                <span className="font-medium text-ink/80">
                  {summary.nextEstimatedCompletion
                    ? summary.nextEstimatedCompletion.toLocaleDateString(
                        "en-NG",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )
                    : "Not available yet"}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href={installmentListPathByRole(session.role)}>
                <Button size="sm">View my installments</Button>
              </Link>
              <p className="text-xs text-ink/45">Last synced moments ago.</p>
            </div>
            {summary.recentPayments.length > 0 && (
              <div className="rounded-lg border border-line p-3">
                <p className="text-xs font-medium text-ink/70">
                  Recent payments
                </p>
                <div className="mt-2 space-y-2">
                  {summary.recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="truncate pr-3 text-ink/60">
                        {payment.productName}
                      </span>
                      <span className="ledger-figure font-medium text-forest-700">
                        {naira(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {summary.totalPlans === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm text-ink/50">
            No installment plans assigned yet.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function VendorCustomerDashboardPage() {
  return (
    <DashboardShell>
      {(session: SessionUser) => (
        <div className="space-y-6">
          <PageHeader
            title={`Welcome Back, ${session.name}`}
            badge={<Badge tone="neutral">Customer Dashboard</Badge>}
            subtitle="Track your installment status and payment activity from one place."
          />
          <CustomerView session={session} />
        </div>
      )}
    </DashboardShell>
  );
}
