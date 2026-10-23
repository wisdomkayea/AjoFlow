"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { formatMoney } from "@/lib/formatters";
import { CheckCircle2, HandCoins, Landmark, Receipt } from "lucide-react";

interface PackageDetail {
  id: string;
  name: string;
  baseTotal: number;
  discountAmount: number;
  finalTotal: number;
  packageProductId: string | null;
  createdAt: string;
  packageProduct: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string | null;
    createdAt: string;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      price: number;
      imageUrl?: string | null;
      createdAt: string;
    };
  }>;
}

interface Installment {
  id: string;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  createdAt: string;
  product: { id: string; name: string };
  customer: { name: string };
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Landmark;
}) {
  return (
    <Card className="rounded-2xl border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-gray-700">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="ledger-figure mt-3 text-[24px] font-bold leading-7 text-gray-900">{value}</p>
    </Card>
  );
}

export default function PackageDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { presentError } = useNotifier();
  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<PackageDetail>(`/api/packages/${id}`),
      apiFetch<Installment[]>("/api/installments"),
    ])
      .then(([packageDetail, installmentsData]) => {
        setDetail(packageDetail);
        setInstallments(installmentsData);
      })
      .catch((error) => presentError(error, "Could not load package details"))
      .finally(() => setLoading(false));
  }, [id, presentError]);

  const rows = useMemo(() => {
    if (!detail?.packageProductId) return [];
    return installments.filter((item) => item.product.id === detail.packageProductId);
  }, [installments, detail]);

  const stats = useMemo(() => {
    const totalCustomers = rows.length;
    const totalBilled = rows.reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
    const totalRevenue = rows.reduce((sum, row) => sum + Number(row.amountPaid ?? 0), 0);
    const outstanding = rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
    return { totalCustomers, totalBilled, totalRevenue, outstanding };
  }, [rows]);

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
        {() => <p className="text-sm text-gray-500">Package not found.</p>}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {() => (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
            <Link href="/dashboards/vendor-hub/products" className="hover:underline">
              Products
            </Link>{" "}
            › <span className="text-primary-600">{detail.name}</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold leading-[48px] text-gray-900">{detail.name}</h1>
              <p className="text-sm text-gray-500">Phones & Electronics · SKU:</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-10 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white">
                Create Sale
              </button>
              <button className="h-10 rounded-[10px] bg-green-100 px-4 text-sm font-semibold text-primary-700">
                Edit
              </button>
            </div>
          </div>

          <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[160px,1fr]">
              {detail.packageProduct?.imageUrl ? (
                <img src={detail.packageProduct.imageUrl} alt={detail.name} className="h-[120px] w-[160px] rounded-xl object-cover" />
              ) : (
                <div className="h-[120px] w-[160px] rounded-xl bg-gray-100" />
              )}
              <div>
                <h2 className="text-[24px] font-semibold leading-7 text-gray-900">{detail.name}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Vorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">NUMBER OF PRODUCTS</p>
                    <p className="font-medium text-gray-800">{detail.items.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">PACKAGE PRICE</p>
                    <p className="font-medium text-gray-800">{formatMoney(detail.finalTotal).replace("₦", "₦ ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ID</p>
                    <p className="font-medium text-gray-800">{detail.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">DATE ADDED</p>
                    <p className="font-medium text-gray-800">
                      {new Date(detail.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-[18px] font-semibold leading-7 text-gray-900">Included Products</p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                  {detail.items.length}
                </span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Products</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Unit</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Price</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 text-sm">
                    <td className="px-4 py-3.5 text-gray-700">{item.product.name}</td>
                    <td className="px-4 py-3.5 text-gray-700">1</td>
                    <td className="px-4 py-3.5 text-gray-700">
                      {formatMoney(item.product.price).replace("₦", "₦ ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <StatCard label="Total Customers" value={String(stats.totalCustomers)} icon={Landmark} />
            <StatCard label="Total Billed" value={formatMoney(stats.totalBilled).replace("₦", "₦ ")} icon={Receipt} />
            <StatCard label="Total Revenue" value={formatMoney(stats.totalRevenue).replace("₦", "₦ ")} icon={HandCoins} />
            <StatCard label="Outstanding Balances" value={formatMoney(stats.outstanding).replace("₦", "₦ ")} icon={CheckCircle2} />
          </div>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-[18px] font-semibold leading-7 text-gray-900">Installment Sales</p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                  {rows.length}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Products</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Total Amount</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Amount Paid</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-200 text-sm">
                      <td className="px-4 py-3.5 text-gray-700">{row.customer.name}</td>
                      <td className="px-4 py-3.5 text-gray-700">{row.product.name}</td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {formatMoney(row.totalAmount).replace("₦", "₦ ")}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {formatMoney(row.amountPaid).replace("₦", "₦ ")}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {formatMoney(row.balance).replace("₦", "₦ ")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                          {row.status === "ACTIVE" ? "Active" : row.status === "COMPLETED" ? "Completed" : "Defaulted"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-gray-500">Page 1 of 1</p>
              <div className="flex items-center gap-2">
                <button className="h-8 rounded-[10px] border border-gray-200 px-3 text-sm text-gray-600">Previous</button>
                <button className="h-8 rounded-[10px] border border-gray-200 px-3 text-sm text-gray-600">Next</button>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[18px] font-semibold leading-7 text-gray-900">Activity</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">4 events recorded</span>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-gray-800">Sale created for John Okoro</p>
                  <p className="text-xs text-gray-500">New installment agreement activated for ₦250,000 with 5 schedule terms.</p>
                </div>
                <p className="text-xs text-gray-500">October 6, 2026 · 14:32</p>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-gray-800">Sale created for William Joe</p>
                  <p className="text-xs text-gray-500">New installment agreement activated for ₦250,000 with 5 schedule terms.</p>
                </div>
                <p className="text-xs text-gray-500">October 5, 2026 · 14:30</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
