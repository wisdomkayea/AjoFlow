"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useNotifier } from "@/components/ui/ToastNotification";
import {
  CheckCircle2,
  ChevronDown,
  Mail,
  Phone,
  Plus,
  Search,
  User,
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
  payments: Array<{ amount: string; paidAt: string }>;
  repaymentPreview?: {
    repaymentFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    numberOfInstallments: number;
  } | null;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  productName: string;
  progressPct: number;
  installmentPlan: string;
  outstanding: number;
  lastPaymentAt: string | null;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
}

interface CreateCustomerPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
  created: boolean;
}

const PAGE_SIZE = 7;

function initials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w[0]?.toUpperCase() ?? "").join("") || "CU";
}

function naira(value: number) {
  return `N${value.toLocaleString("en-NG")}`;
}

function dateLabel(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function planLabel(
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | undefined,
  installments: number | undefined,
) {
  const base =
    frequency === "DAILY"
      ? "Daily"
      : frequency === "WEEKLY"
        ? "Weekly"
        : "Monthly";

  if (!installments || installments < 1) return `${base} Plan`;
  return `${base} x${installments}`;
}

function toCustomerRows(installments: InstallmentRow[]): CustomerRow[] {
  const grouped = new Map<string, InstallmentRow[]>();
  for (const installment of installments) {
    const key = installment.customer.id;
    const current = grouped.get(key) ?? [];
    current.push(installment);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([customerId, rows]) => {
    const sortedByDate = [...rows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sortedByDate[0];

    const totalAmount = rows.reduce(
      (sum, row) => sum + Number(row.totalAmount ?? 0),
      0,
    );
    const amountPaid = rows.reduce(
      (sum, row) => sum + Number(row.amountPaid ?? 0),
      0,
    );
    const outstanding = rows.reduce(
      (sum, row) => sum + Number(row.balance ?? 0),
      0,
    );
    const progressPct =
      totalAmount > 0
        ? Math.max(0, Math.min(100, (amountPaid / totalAmount) * 100))
        : 0;

    const lastPayment = rows
      .flatMap((row) => row.payments ?? [])
      .sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      )[0];

    const hasActive = rows.some((row) => Number(row.balance ?? 0) > 0);
    const hasDefaulted = rows.some((row) => row.status === "DEFAULTED");
    const status: CustomerRow["status"] = hasActive
      ? "ACTIVE"
      : hasDefaulted
        ? "DEFAULTED"
        : "COMPLETED";

    return {
      id: customerId,
      name: latest.customer.name,
      email: latest.customer.email,
      productName: latest.product.name,
      progressPct,
      installmentPlan: planLabel(
        latest.repaymentPreview?.repaymentFrequency,
        latest.repaymentPreview?.numberOfInstallments,
      ),
      outstanding,
      lastPaymentAt: lastPayment?.paidAt ?? null,
      status,
    };
  });
}

function CustomersContent() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [newRows, setNewRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "COMPLETED" | "DEFAULTED"
  >("ALL");
  const [sortBy, setSortBy] = useState<
    "INSTALLMENT_PLAN" | "OUTSTANDING" | "LAST_PAYMENT"
  >("INSTALLMENT_PLAN");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [bannerName, setBannerName] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const { presentError, success } = useNotifier();

  const loadCustomers = useCallback(() => {
    setLoading(true);
    apiFetch<InstallmentRow[]>("/api/installments")
      .then((installments) => {
        setRows(toCustomerRows(installments));
      })
      .catch((error) => {
        presentError(error, "Could not load customers");
      })
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const mergedRows = useMemo(() => {
    const byId = new Map<string, CustomerRow>();
    for (const row of newRows) {
      byId.set(row.id, row);
    }
    for (const row of rows) {
      byId.set(row.id, row);
    }
    return Array.from(byId.values());
  }, [newRows, rows]);

  const phoneMissing = form.phone.trim().length === 0;
  const isFormValid =
    form.name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.phone.trim().length >= 7;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let next = mergedRows.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.phone ?? "").toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q)
      );
    });

    next = next.sort((a, b) => {
      if (sortBy === "OUTSTANDING") return b.outstanding - a.outstanding;
      if (sortBy === "LAST_PAYMENT") {
        return (
          new Date(b.lastPaymentAt ?? 0).getTime() -
          new Date(a.lastPaymentAt ?? 0).getTime()
        );
      }
      return a.installmentPlan.localeCompare(b.installmentPlan);
    });

    return next;
  }, [mergedRows, search, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const submitNewCustomer = async () => {
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const payload = await apiFetch<CreateCustomerPayload>(
        "/api/vendor/customers",
        {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          }),
        },
      );

      setShowAddModal(false);
      setShowSuccessBanner(true);
      setBannerName(payload.name);
      setNewRows((current) => {
        if (
          current.some((row) => row.id === payload.id) ||
          rows.some((row) => row.id === payload.id)
        ) {
          return current;
        }

        return [
          {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            productName: "No product assigned",
            progressPct: 0,
            installmentPlan: "No plan yet",
            outstanding: 0,
            lastPaymentAt: null,
            status: "COMPLETED",
          },
          ...current,
        ];
      });
      setForm({ name: "", email: "", phone: "" });

      if (!payload.created) {
        success("Customer already exists and is now linked for future plans.");
      }

      loadCustomers();
    } catch (error) {
      presentError(error, "Could not add customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Everyone buying from you on installment"
        actions={
          <Button
            size="sm"
            className="h-10 rounded-lg px-4"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4" />
            Add Customers
          </Button>
        }
      />

      {showSuccessBanner && (
        <Card className="border-forest-300">
          <CardBody className="flex items-start justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-forest-100 text-forest-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-semibold text-ink">
                  Customer successfully created
                </p>
                <p className="text-sm text-ink/60">
                  The customer &quot;{bannerName}&quot; has been added
                  successfully
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded p-1 text-ink/60 hover:bg-forest-50"
              aria-label="Dismiss success message"
              onClick={() => setShowSuccessBanner(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl border-line/90">
        <CardBody className="p-0">
          <div className="border-b border-line bg-white px-4 py-4 sm:px-1">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-ink">
                  All Customers
                </h2>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                  {filteredRows.length} users
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 sm:min-w-[280px]">
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

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(
                        event.target.value as typeof statusFilter,
                      );
                      setPage(1);
                    }}
                    className="h-10 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                  >
                    <option value="ALL">Filters</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DEFAULTED">Defaulted</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value as typeof sortBy);
                      setPage(1);
                    }}
                    className="h-10 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                  >
                    <option value="INSTALLMENT_PLAN">
                      Sort by: Installment Plan
                    </option>
                    <option value="OUTSTANDING">Sort by: Outstanding</option>
                    <option value="LAST_PAYMENT">Sort by: Last Payment</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-line bg-canvas/50 text-xs text-ink/55">
                  <th className="px-4 py-3 font-medium sm:px-5">Customer</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Product
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">
                    Progress
                  </th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">
                    Installment Plan
                  </th>
                  <th className="px-4 py-3 font-medium">Outstanding</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">
                    Last Payment
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <tr
                      key={`skeleton-${index}`}
                      className="border-b border-line"
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <Skeleton className="h-8 w-44" />
                      </td>
                      <td className="hidden px-4 py-4 md:table-cell">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell">
                        <Skeleton className="h-5 w-28" />
                      </td>
                      <td className="hidden px-4 py-4 xl:table-cell">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell">
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
                      No customers match your current filter.
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
                            {initials(row.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">
                              {row.name}
                            </p>
                            <p className="truncate text-xs text-ink/45">
                              {row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 text-ink/70 md:table-cell">
                        {row.productName}
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-violet-100">
                            <div
                              className="h-full rounded-full bg-forest-600"
                              style={{ width: `${row.progressPct}%` }}
                            />
                          </div>
                          <span className="text-ink/70">
                            {Math.round(row.progressPct)}%
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 text-ink/70 xl:table-cell">
                        {row.installmentPlan}
                      </td>
                      <td className="px-4 py-3.5 text-ink/70">
                        {naira(row.outstanding)}
                      </td>
                      <td className="hidden px-4 py-3.5 text-ink/70 lg:table-cell">
                        {dateLabel(row.lastPaymentAt)}
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4">
          <div className="w-full max-w-xl rounded-xl border border-line bg-white p-6 shadow-card">
            <div className="mb-5">
              <h2 className="text-3xl font-semibold text-ink">
                Add New Customer
              </h2>
              <p className="mt-1 text-sm text-ink/50">
                {phoneMissing
                  ? "Record who is buying on installment. Phone is required."
                  : "Fill in the fields to add a customer"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="customer-name"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                  <Input
                    id="customer-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="John Mercie Brown"
                    className="h-11 rounded-lg pl-9"
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="customer-email"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                  <Input
                    id="customer-email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="johnmercy03@gmail.com"
                    className="h-11 rounded-lg pl-9"
                    type="email"
                  />
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="customer-phone"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                  <Input
                    id="customer-phone"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="081358099876"
                    className="h-11 rounded-lg pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="h-11 border-gold-400 text-gold-700 hover:bg-gold-50"
                onClick={() => {
                  setShowAddModal(false);
                  setForm({ name: "", email: "", phone: "" });
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="h-11"
                onClick={submitNewCustomer}
                disabled={!isFormValid || submitting}
              >
                {submitting ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VendorCustomersPage() {
  return <DashboardShell>{() => <CustomersContent />}</DashboardShell>;
}
