"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { formatDate, formatMoney } from "@/lib/formatters";
import {
  ArrowRight,
  CheckCircle2,
  CirclePlus,
  Filter,
  Mail,
  Phone,
  Search,
  UploadCloud,
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

interface CustomerDirectoryUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER";
}

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  productPrimary: string;
  productMeta: string | null;
  installmentPlan: string;
  outstanding: number | null;
  lastPaymentAt: string | null;
  hasPlan: boolean;
}

interface CreateCustomerPayload {
  id: string;
  name: string;
  email: string;
  phone: string;
  created: boolean;
}

const PAGE_SIZE = 8;

function initials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "CU";
}

function mapInstallmentPlan(installment: InstallmentRow) {
  if (!installment.repaymentPreview) return "Pay Small Small";
  const frequency = installment.repaymentPreview.repaymentFrequency;
  if (frequency === "DAILY") return "Daily Plan";
  if (frequency === "WEEKLY") return "Weekly Plan";
  return "Pay Small Small";
}

function toCustomerRows(installments: InstallmentRow[]) {
  const grouped = new Map<string, InstallmentRow[]>();
  for (const installment of installments) {
    const existing = grouped.get(installment.customer.id) ?? [];
    existing.push(installment);
    grouped.set(installment.customer.id, existing);
  }

  return Array.from(grouped.values()).map((rows) => {
    const sorted = [...rows].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sorted[0];
    const products = Array.from(new Set(rows.map((row) => row.product.name)));

    const allPayments = rows
      .flatMap((row) => row.payments ?? [])
      .sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      );

    const outstanding = rows.reduce(
      (sum, row) => sum + Number(row.balance ?? 0),
      0,
    );

    return {
      id: latest.customer.id,
      name: latest.customer.name,
      email: latest.customer.email,
      phone: null,
      productPrimary: products[0] ?? "Not Assigned",
      productMeta:
        products.length > 1 ? `${products[0].toLowerCase()} +${products.length - 1}` : null,
      installmentPlan: mapInstallmentPlan(latest),
      outstanding,
      lastPaymentAt: allPayments[0]?.paidAt ?? null,
      hasPlan: true,
    } satisfies CustomerRow;
  });
}

function EmptyCustomersState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-primary-600">
          <User className="h-10 w-10" />
        </div>
        <h2 className="text-[28px] font-bold leading-[48px] text-gray-900">
          No Customers added yet
        </h2>
        <p className="mt-1 text-sm font-normal leading-5 text-gray-500">
          Click on the button to add a customer
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
        >
          <CirclePlus className="h-4 w-4" />
          Add Customers
        </button>
      </div>
    </div>
  );
}

function CustomersContent() {
  const router = useRouter();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "INSTALLMENT_PLAN" | "OUTSTANDING" | "LAST_PAYMENT"
  >("INSTALLMENT_PLAN");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "WITH_PLAN" | "NO_PLAN">(
    "ALL",
  );
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [bannerName, setBannerName] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const { presentError, success } = useNotifier();

  const loadCustomers = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch<InstallmentRow[]>("/api/installments"),
      apiFetch<CustomerDirectoryUser[]>("/api/users?role=CUSTOMER"),
    ])
      .then(([installments, customers]) => {
        const fromInstallments = toCustomerRows(installments);
        const byId = new Map<string, CustomerRow>();
        for (const row of fromInstallments) byId.set(row.id, row);

        for (const customer of customers) {
          if (!byId.has(customer.id)) {
            byId.set(customer.id, {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: null,
              productPrimary: "Not Assigned",
              productMeta: null,
              installmentPlan: "Not Set Up",
              outstanding: null,
              lastPaymentAt: null,
              hasPlan: false,
            });
          }
        }

        setRows(Array.from(byId.values()));
      })
      .catch((error) => {
        presentError(error, "Could not load customers");
      })
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (statusFilter === "WITH_PLAN" && !row.hasPlan) return false;
      if (statusFilter === "NO_PLAN" && row.hasPlan) return false;
      if (!query) return true;
      return (
        row.name.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        (row.phone ?? "").toLowerCase().includes(query) ||
        row.productPrimary.toLowerCase().includes(query)
      );
    });

    return list.sort((a, b) => {
      if (sortBy === "OUTSTANDING") {
        return (b.outstanding ?? -1) - (a.outstanding ?? -1);
      }
      if (sortBy === "LAST_PAYMENT") {
        return (
          new Date(b.lastPaymentAt ?? 0).getTime() -
          new Date(a.lastPaymentAt ?? 0).getTime()
        );
      }
      return a.installmentPlan.localeCompare(b.installmentPlan);
    });
  }, [rows, search, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const showFullEmpty =
    !loading &&
    rows.length === 0 &&
    search.trim().length === 0 &&
    statusFilter === "ALL";

  const isFormValid =
    form.name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.phone.trim().length >= 7;

  async function submitNewCustomer() {
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    try {
      const payload = await apiFetch<CreateCustomerPayload>("/api/vendor/customers", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        }),
      });

      setShowAddModal(false);
      setShowSuccessBanner(true);
      setBannerName(payload.name);
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
  }

  if (showFullEmpty) {
    return <EmptyCustomersState onAdd={() => setShowAddModal(true)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold leading-8 text-gray-900">
            Customers
          </h1>
          <p className="text-sm font-normal leading-5 text-gray-500">
            Everyone buying from you on installment
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
        >
          <CirclePlus className="h-4 w-4" />
          Add Customers
        </button>
      </div>

      {showSuccessBanner && (
        <Card className="rounded-2xl border border-green-200">
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-100 text-primary-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[28px] font-semibold leading-9 text-gray-900">
                  Customer successfully created
                </p>
                <p className="text-sm font-normal leading-5 text-gray-500">
                  The customer &quot;{bannerName}&quot; has been added successfully
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessBanner(false)}
              aria-label="Dismiss success banner"
              className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold leading-7 text-gray-900">
                All Customers
              </h2>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {filteredRows.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
              <div className="relative min-w-[220px] flex-1 sm:min-w-[280px] xl:w-[280px] xl:min-w-[280px] xl:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-[10px] border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                  placeholder="Search name or phone"
                />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as typeof statusFilter);
                    setPage(1);
                  }}
                  className="h-10 appearance-none rounded-[10px] border border-gray-200 bg-gray-50 px-3 pr-8 text-sm text-gray-700 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                >
                  <option value="ALL">Filters</option>
                  <option value="WITH_PLAN">With Plan</option>
                  <option value="NO_PLAN">No Plan</option>
                </select>
                <Filter className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              </div>

              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as typeof sortBy);
                  setPage(1);
                }}
                className="h-10 rounded-[10px] border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100 xl:w-[210px]"
              >
                <option value="INSTALLMENT_PLAN">Sort by: Installment Plan</option>
                <option value="OUTSTANDING">Sort by: Outstanding</option>
                <option value="LAST_PAYMENT">Sort by: Last Payment</option>
              </select>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 sm:px-5">
                  Customer
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 md:table-cell">
                  Product
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 lg:table-cell">
                  Installment Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Outstanding
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-500 lg:table-cell">
                  Last Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="border-b border-gray-200">
                    <td className="px-4 py-4 sm:px-5">
                      <Skeleton className="h-8 w-44" />
                    </td>
                    <td className="hidden px-4 py-4 md:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-5 w-20" />
                    </td>
                  </tr>
                ))}

              {!loading && paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    No customers match your current filter.
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedRows.map((row) => {
                  const href = {
                    pathname: `/dashboards/vendor-hub/customers/${row.id}`,
                    query: {
                      name: row.name,
                      email: row.email,
                      ...(row.phone ? { phone: row.phone } : {}),
                    },
                  };

                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-gray-200 text-sm text-gray-800 hover:bg-gray-50"
                      onClick={() =>
                        router.push(
                          `/dashboards/vendor-hub/customers/${row.id}?name=${encodeURIComponent(
                            row.name,
                          )}&email=${encodeURIComponent(row.email)}${
                            row.phone
                              ? `&phone=${encodeURIComponent(row.phone)}`
                              : ""
                          }`,
                        )
                      }
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-primary-700">
                            {initials(row.name)}
                          </div>
                          <p className="truncate text-sm font-medium leading-5 text-gray-900">
                            {row.name}
                          </p>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 md:table-cell">
                        <p className="text-sm font-medium leading-5 text-gray-800">
                          {row.productPrimary}
                        </p>
                        {row.productMeta && (
                          <p className="text-sm font-normal leading-5 text-gray-500">
                            {row.productMeta}
                          </p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3.5 text-sm font-normal leading-5 text-gray-500 lg:table-cell">
                        {row.installmentPlan}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-normal leading-5 text-gray-500">
                        {row.outstanding === null ? "-" : formatMoney(row.outstanding).replace("₦", "₦ ")}
                      </td>
                      <td className="hidden px-4 py-3.5 text-sm font-normal leading-5 text-gray-500 lg:table-cell">
                        {row.lastPaymentAt ? formatDate(row.lastPaymentAt, { month: "long" }) : "No Payments"}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.hasPlan ? (
                          <Link
                            href={href}
                            onClick={(event) => event.stopPropagation()}
                            className="text-sm font-medium leading-5 text-primary-600 hover:underline"
                          >
                            View
                          </Link>
                        ) : (
                          <Link
                            href={href}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-[10px] bg-primary-500 px-3 py-1.5 text-sm font-medium leading-5 text-white hover:bg-primary-600"
                          >
                            Set Up Plan
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <p className="text-sm font-normal leading-5 text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="h-10 rounded-[10px] border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="h-10 rounded-[10px] border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[720px] rounded-[14px] border border-gray-200 bg-white p-6 shadow-card">
            <div className="mb-4">
              <h2 className="text-[32px] font-semibold leading-10 text-gray-900">
                Add New Customer
              </h2>
              <p className="text-sm font-normal leading-5 text-gray-500">
                Record who is buying on installment. Phone is required.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="customer-name">
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    id="customer-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="h-11 w-full rounded-[10px] border border-gray-200 px-3 pl-9 text-sm text-gray-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                    placeholder="Precious Wen"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="customer-email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    id="customer-email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    type="email"
                    className="h-11 w-full rounded-[10px] border border-gray-200 px-3 pl-9 text-sm text-gray-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                    placeholder="wenprecious@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="customer-phone">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    id="customer-phone"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="h-11 w-full rounded-[10px] border border-gray-200 px-3 pl-9 text-sm text-gray-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                    placeholder="081358099876"
                  />
                </div>
              </div>

              <div className="rounded-[10px] border border-dashed border-gray-300 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <UploadCloud className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-5 text-gray-800">Tap to Upload</p>
                      <p className="text-xs font-normal leading-4 text-gray-500">PNG, JPG, 1MB max.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="h-8 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setForm({ name: "", email: "", phone: "" });
                }}
                disabled={submitting}
                className="h-11 rounded-[10px] border border-[#E0B84E] bg-white text-sm font-semibold text-[#B45309] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNewCustomer}
                disabled={!isFormValid || submitting}
                className="h-11 rounded-[10px] bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Customer"}
              </button>
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
