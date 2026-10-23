"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { formatMoney } from "@/lib/formatters";
import { CirclePlus, Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  kind?: "STANDARD" | "PACKAGE";
}

interface ProductPackageSummary {
  id: string;
  name: string;
  productId: string | null;
  baseTotal: number;
  discountAmount: number;
  finalTotal: number;
  productCount: number;
  createdAt: string;
}

interface InstallmentRow {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  product: { id: string; name: string };
  customer: { name: string };
}

type ProductsTab = "products" | "packages";

const PAGE_SIZE = 8;

function inferCategory(name: string) {
  const normalized = name.toLowerCase();
  if (
    normalized.includes("iphone") ||
    normalized.includes("samsung") ||
    normalized.includes("xiaomi") ||
    normalized.includes("tecno") ||
    normalized.includes("phone")
  ) {
    return "Phones";
  }
  if (normalized.includes("playstation") || normalized.includes("xbox")) {
    return "Game";
  }
  if (normalized.includes("table") || normalized.includes("chair")) {
    return "Furniture";
  }
  return "General";
}

function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-10 flex min-h-[58vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-primary-600">
          <CirclePlus className="h-10 w-10" />
        </div>
        <h2 className="text-[28px] font-bold leading-[48px] text-gray-900">No Products Added</h2>
        <p className="mt-1 text-sm text-gray-500">
          Click on the button to add a new product
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
        >
          <CirclePlus className="h-4 w-4" />
          Add Product
        </button>
      </div>
    </div>
  );
}

function VendorProductsContent() {
  const router = useRouter();
  const [tab, setTab] = useState<ProductsTab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<ProductPackageSummary[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { presentError } = useNotifier();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch<Product[]>("/api/products"),
      apiFetch<ProductPackageSummary[]>("/api/packages"),
      apiFetch<InstallmentRow[]>("/api/installments"),
    ])
      .then(([productsData, packagesData, installmentsData]) => {
        setProducts(productsData);
        setPackages(packagesData);
        setInstallments(installmentsData);
      })
      .catch((error) => presentError(error, "Could not load products"))
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const productRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((row) => row.kind !== "PACKAGE")
      .filter((row) => {
        if (!query) return true;
        return (
          row.name.toLowerCase().includes(query) ||
          inferCategory(row.name).toLowerCase().includes(query)
        );
      })
      .map((row) => {
        const activeInstallments = installments.filter(
          (installment) =>
            installment.product.id === row.id && installment.status === "ACTIVE",
        ).length;
        return {
          ...row,
          category: inferCategory(row.name),
          activeInstallments,
        };
      });
  }, [products, installments, search]);

  const packageRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return packages.filter((row) => {
      if (!query) return true;
      return row.name.toLowerCase().includes(query);
    });
  }, [packages, search]);

  const currentRowsCount = tab === "products" ? productRows.length : packageRows.length;
  const totalPages = Math.max(1, Math.ceil(currentRowsCount / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedProductRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return productRows.slice(start, start + PAGE_SIZE);
  }, [productRows, page]);

  const pagedPackageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return packageRows.slice(start, start + PAGE_SIZE);
  }, [packageRows, page]);

  const showEmptyState =
    !loading &&
    search.trim().length === 0 &&
    ((tab === "products" && productRows.length === 0) ||
      (tab === "packages" && packageRows.length === 0));

  if (showEmptyState) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold leading-8 text-gray-900">Products</h1>
            <p className="text-sm text-gray-500">Manage the products and packages you sell</p>
          </div>
        </div>
        <div className="border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`h-9 border-b-2 px-3 text-sm font-medium ${
              tab === "products"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500"
            }`}
          >
            All Products
          </button>
          <button
            type="button"
            onClick={() => setTab("packages")}
            className={`h-9 border-b-2 px-3 text-sm font-medium ${
              tab === "packages"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500"
            }`}
          >
            Packages
          </button>
        </div>
        <EmptyProducts onAdd={() => router.push("/dashboards/vendor-hub/products/create-product")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold leading-8 text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage the products and packages you sell</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboards/vendor-hub/products/create-product"
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
          >
            <CirclePlus className="h-4 w-4" />
            Add Products
          </Link>
          <Link
            href="/dashboards/vendor-hub/products/create-package"
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-green-100 px-4 text-sm font-semibold text-primary-700 hover:bg-green-200"
          >
            <CirclePlus className="h-4 w-4" />
            Create Package
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("products")}
          className={`h-9 border-b-2 px-3 text-sm font-medium ${
            tab === "products"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500"
          }`}
        >
          All Products
        </button>
        <button
          type="button"
          onClick={() => setTab("packages")}
          className={`h-9 border-b-2 px-3 text-sm font-medium ${
            tab === "packages"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-gray-500"
          }`}
        >
          Packages
        </button>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold leading-7 text-gray-900">
                {tab === "products" ? "All Products" : "Packages"}
              </h2>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                {currentRowsCount} {tab === "products" ? "Products" : "Packages"}
              </span>
            </div>
          </div>
          <div className="mt-3 max-w-[420px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-[10px] border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                placeholder={tab === "products" ? "Search name or phone" : "Search package name"}
              />
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          {tab === "products" ? (
            <table className="w-full min-w-[740px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 sm:px-5">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Categories
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Active Installments
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <tr key={`products-loading-${index}`} className="border-b border-gray-200">
                      <td className="px-4 py-4 sm:px-5">
                        <Skeleton className="h-8 w-40" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-28" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-16" />
                      </td>
                    </tr>
                  ))}

                {!loading &&
                  pagedProductRows.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => router.push(`/dashboards/vendor-hub/products/${product.id}`)}
                      className="cursor-pointer border-b border-gray-200 text-sm hover:bg-gray-50"
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-100" />
                          )}
                          <p className="text-sm font-medium text-gray-800">{product.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{product.category}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">
                        {formatMoney(product.price).replace("₦", "₦ ")}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{product.activeInstallments}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[740px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 sm:px-5">
                    Packages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Included Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Package Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Date Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <tr key={`packages-loading-${index}`} className="border-b border-gray-200">
                      <td className="px-4 py-4 sm:px-5">
                        <Skeleton className="h-8 w-40" />
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
                    </tr>
                  ))}

                {!loading &&
                  pagedPackageRows.map((pkg) => (
                    <tr
                      key={pkg.id}
                      onClick={() =>
                        router.push(`/dashboards/vendor-hub/products/packages/${pkg.id}`)
                      }
                      className="cursor-pointer border-b border-gray-200 text-sm hover:bg-gray-50"
                    >
                      <td className="px-4 py-3.5 sm:px-5">
                        <p className="text-sm font-medium text-gray-800">{pkg.name}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{pkg.productCount}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">
                        {formatMoney(pkg.finalTotal).replace("₦", "₦ ")}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">
                        {new Date(pkg.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <p className="text-sm text-gray-500">
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
    </div>
  );
}

export default function VendorProductsPage() {
  return <DashboardShell>{() => <VendorProductsContent />}</DashboardShell>;
}
