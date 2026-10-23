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
import { CheckCircle2, CirclePlus, HandCoins, Landmark, Receipt } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  createdAt: string;
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

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { presentError } = useNotifier();
  const [products, setProducts] = useState<Product[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<Product[]>("/api/products"),
      apiFetch<Installment[]>("/api/installments"),
    ])
      .then(([productsData, installmentsData]) => {
        setProducts(productsData);
        setInstallments(installmentsData);
      })
      .catch((error) => presentError(error, "Could not load product details"))
      .finally(() => setLoading(false));
  }, [presentError]);

  const product = useMemo(() => products.find((row) => row.id === id) ?? null, [products, id]);
  const rows = useMemo(
    () => installments.filter((row) => row.product.id === id),
    [installments, id],
  );

  const stats = useMemo(() => {
    const totalCustomers = rows.length;
    const totalBilled = rows.reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
    const totalRevenue = rows.reduce((sum, row) => sum + Number(row.amountPaid ?? 0), 0);
    const outstanding = rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
    return {
      totalCustomers,
      totalBilled,
      totalRevenue,
      outstanding,
    };
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

  if (!product) {
    return (
      <DashboardShell>
        {() => <p className="text-sm text-gray-500">Product not found.</p>}
      </DashboardShell>
    );
  }

  const hasInstallments = rows.length > 0;

  return (
    <DashboardShell>
      {() => (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">
            <Link href="/dashboards/vendor-hub/products" className="hover:underline">
              Products
            </Link>{" "}
            › <span className="text-primary-600">{product.name}</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold leading-[48px] text-gray-900">{product.name}</h1>
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
            <div className="grid gap-4 md:grid-cols-[240px,1fr]">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-[150px] w-[240px] rounded-xl object-cover" />
              ) : (
                <div className="h-[150px] w-[240px] rounded-xl bg-gray-100" />
              )}
              <div>
                <h2 className="text-[24px] font-semibold leading-7 text-gray-900">{product.name}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Samsung Galaxy A15 128GB smartphone with 6.5-inch Super AMOLED display.
                </p>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">CATEGORY</p>
                    <p className="font-medium text-gray-800">Phones & Electronics</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">SKU</p>
                    <p className="font-medium text-gray-800">SAM-A15-128</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">DATE ADDED</p>
                    <p className="font-medium text-gray-800">
                      {new Date(product.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">AMOUNT</p>
                    <p className="font-medium text-gray-800">
                      {formatMoney(product.price).replace("₦", "₦ ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {!hasInstallments ? (
            <div className="flex min-h-[38vh] items-center justify-center">
              <div className="text-center">
                <h2 className="text-[40px] font-bold leading-[48px] text-gray-900">No Installmental Paments made yet</h2>
                <p className="text-sm text-gray-500">When a customer makes payments, it will appear here</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <StatCard label="Total Customers" value={String(stats.totalCustomers)} icon={Landmark} />
                <StatCard label="Total Billed" value={formatMoney(stats.totalBilled).replace("₦", "₦ ")} icon={Receipt} />
                <StatCard label="Total Revenue" value={formatMoney(stats.totalRevenue).replace("₦", "₦ ")} icon={HandCoins} />
                <StatCard label="Outstanding Balances" value={formatMoney(stats.outstanding).replace("₦", "₦ ")} icon={CheckCircle2} />
              </div>

              <Card className="rounded-2xl border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[18px] font-semibold leading-7 text-gray-900">Installment Sales</p>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-primary-700">{rows.length}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs text-gray-500">Customer</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500">Total Amount</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500">Amount Paid</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500">Balance</th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b border-gray-200 text-sm">
                          <td className="px-4 py-3.5 text-gray-700">{row.customer.name}</td>
                          <td className="px-4 py-3.5 text-gray-700">{formatMoney(row.totalAmount).replace("₦", "₦ ")}</td>
                          <td className="px-4 py-3.5 text-gray-700">{formatMoney(row.amountPaid).replace("₦", "₦ ")}</td>
                          <td className="px-4 py-3.5 text-gray-700">{formatMoney(row.balance).replace("₦", "₦ ")}</td>
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
            </>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
