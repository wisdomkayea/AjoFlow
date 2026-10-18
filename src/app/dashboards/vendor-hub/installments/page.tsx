"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { Copy, Search } from "lucide-react";
import type { SessionUser } from "@/types";

interface InstallmentRow {
  id: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  policyTemplateName?: string | null;
  product: { name: string };
  customer: { name: string; email: string };
  repaymentPreview?: {
    repaymentFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    numberOfInstallments: number;
  } | null;
}

const PAGE_SIZE = 7;

function naira(n: number | string) {
  return `N${Number(n).toLocaleString("en-NG")}`;
}

function VendorInstallmentsContent() {
  const [rows, setRows] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { presentError, success } = useNotifier();

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<InstallmentRow[]>("/api/installments")
      .then((data) => setRows(data))
      .catch((error) => presentError(error, "Could not load installments"))
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      return (
        row.customer.name.toLowerCase().includes(q) ||
        row.customer.email.toLowerCase().includes(q) ||
        row.product.name.toLowerCase().includes(q) ||
        (row.policyTemplateName ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  async function copyLink(installmentId: string) {
    try {
      const origin = window.location.origin;
      const link = `${origin}/dashboards/vendor-customer/installments/${installmentId}`;
      await navigator.clipboard.writeText(link);
      success("Installment link copied.");
    } catch {
      presentError(new Error("Copy failed"), "Could not copy link");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Installments"
        subtitle="Installment agreements between you and your customers"
        actions={
          <Link href="/dashboards/vendor-hub/installments/create-installment">
            <Button size="sm" className="h-10 rounded-lg px-4">
              New Plan
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden rounded-2xl border-line/90">
        <CardBody className="p-0">
          <div className="flex flex-col gap-3 border-b border-line bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="inline-flex w-fit rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
              {rows.length} Payment Plans
            </span>
            <div className="relative w-full sm:w-[380px]">
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
          </div>

          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-line bg-canvas/50 text-xs text-ink/55">
                <th className="px-1 py-3 font-medium sm:px-5">Customer</th>
                <th className="px-1 py-3 font-medium">Product</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  Progress
                </th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-1 py-3 font-medium">Template</th>
                <th className="px-1 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <tr key={index} className="border-b border-line">
                    <td className="px-4 py-4 sm:px-5">
                      <Skeleton className="h-10 w-32" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-5 w-20" />
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
                  </tr>
                ))}

              {!loading && paginatedRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-ink/50 sm:px-5"
                  >
                    No installment plans found.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedRows.map((row) => {
                  const schedule = row.repaymentPreview
                    ? `${row.repaymentPreview.repaymentFrequency.toLowerCase()} | ${row.repaymentPreview.numberOfInstallments}x`
                    : "-";
                  const totalAmount = Number(row.totalAmount ?? 0);
                  const amountPaid = Number(row.amountPaid ?? 0);
                  const outstanding = Number(row.balance ?? 0);
                  const progressPct =
                    totalAmount > 0
                      ? Math.max(
                          0,
                          Math.min(100, (amountPaid / totalAmount) * 100),
                        )
                      : 0;

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line text-sm text-ink/85"
                    >
                      <td className="px-1 py-3.5 sm:px-5">
                        <Link
                          href={`/dashboards/vendor-hub/installments/${row.id}`}
                          className="block hover:underline"
                        >
                          <p className="font-medium text-ink">
                            {row.customer.name}
                          </p>
                          <p className="text-xs text-ink/50">{schedule}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {row.product.name}
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-violet-100">
                            <div
                              className="h-full rounded-full bg-forest-600"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-ink/70">
                            {Math.round(progressPct)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {naira(outstanding)}
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {naira(row.totalAmount)}
                      </td>
                      <td className="px-1 py-3.5 text-ink/70">
                        {row.policyTemplateName ?? "None"}
                      </td>
                      <td className="px-1 py-3.5">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-violet-700 hover:underline"
                          onClick={() => copyLink(row.id)}
                        >
                          <span className="truncate">Copy link</span>
                          <Copy className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

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
    </div>
  );
}

function CustomerInstallmentsContent() {
  return (
    <Card className="p-6">
      <p className="text-sm text-ink/60">
        Switch to vendor account to manage installment plans.
      </p>
    </Card>
  );
}

export default function VendorHubInstallmentsPage() {
  return (
    <DashboardShell>
      {(session: SessionUser) =>
        session.role === "VENDOR" ? (
          <VendorInstallmentsContent />
        ) : (
          <CustomerInstallmentsContent />
        )
      }
    </DashboardShell>
  );
}
