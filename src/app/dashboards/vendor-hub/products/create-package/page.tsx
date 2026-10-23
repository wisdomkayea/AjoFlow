"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { useNotifier } from "@/components/ui/ToastNotification";
import { ArrowLeft, Check, CircleCheck, Minus, Plus, Search } from "lucide-react";

type PackageStep = 0 | 1 | 2 | 3;

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  kind?: "STANDARD" | "PACKAGE";
}

interface CreatedPackageResponse {
  id: string;
  name: string;
  productId: string;
  finalTotal: number;
}

function StepRail({ step }: { step: PackageStep }) {
  const rows = [
    { title: "Package Details", desc: "Name and describe the package" },
    { title: "Add Products", desc: "Choose products included in this package" },
    { title: "Package Price", desc: "Choose how much customers pay for this package" },
    { title: "Review", desc: "Check everything before creating" },
  ];

  return (
    <div className="w-full max-w-[260px] space-y-3">
      {rows.map((row, index) => {
        const complete = index < step;
        const current = index === step;
        return (
          <div key={row.title} className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${complete || current ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-400"}`}>
              {complete ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${current ? "text-primary-600" : "text-gray-700"}`}>{row.title}</p>
              <p className={`text-xs ${current ? "text-primary-600" : "text-gray-500"}`}>{row.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreatePackagePage() {
  const router = useRouter();
  const { presentError } = useNotifier();
  const [step, setStep] = useState<PackageStep>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [created, setCreated] = useState<CreatedPackageResponse | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    packagePrice: "",
  });

  useEffect(() => {
    apiFetch<Product[]>("/api/products")
      .then((rows) => setProducts(rows.filter((item) => item.kind !== "PACKAGE")))
      .catch((error) => presentError(error, "Could not load products"));
  }, [presentError]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((row) => !q || row.name.toLowerCase().includes(q));
  }, [products, search]);

  const selectedRows = useMemo(
    () => products.filter((row) => selected[row.id] && selected[row.id] > 0),
    [products, selected],
  );

  const productTotal = useMemo(
    () =>
      selectedRows.reduce(
        (sum, row) => sum + Number(row.price) * (selected[row.id] ?? 1),
        0,
      ),
    [selectedRows, selected],
  );
  const packagePrice = Number(form.packagePrice || 0);
  const savings = Math.max(0, productTotal - packagePrice);

  function toggleProduct(id: string) {
    setSelected((current) => {
      if (current[id]) {
        const copy = { ...current };
        delete copy[id];
        return copy;
      }
      return { ...current, [id]: 1 };
    });
  }

  function adjustQty(id: string, dir: "inc" | "dec") {
    setSelected((current) => {
      if (!current[id]) return current;
      const next = dir === "inc" ? current[id] + 1 : Math.max(1, current[id] - 1);
      return { ...current, [id]: next };
    });
  }

  const canNext =
    step === 0
      ? form.name.trim().length >= 2
      : step === 1
        ? selectedRows.length > 0
        : step === 2
          ? packagePrice > 0
          : true;

  async function createPackage() {
    if (saving) return;
    setSaving(true);
    try {
      const createdPackage = await apiFetch<CreatedPackageResponse>("/api/packages", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          productIds: selectedRows.map((item) => item.id),
          pricingMode: packagePrice > 0 && packagePrice !== productTotal ? "MANUAL" : "NO_DISCOUNT",
          finalPrice: packagePrice > 0 && packagePrice !== productTotal ? packagePrice : undefined,
        }),
      });
      setCreated(createdPackage);
      setShowSuccess(true);
    } catch (error) {
      presentError(error, "Could not create package");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      {() => (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <Link
              href="/dashboards/vendor-hub/products"
              className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-[28px] font-bold leading-[48px] text-gray-900">Create Package</h1>
              <p className="text-sm text-gray-500">Combine products you normally sell together</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
            <StepRail step={step} />

            <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
              {step === 0 && (
                <div>
                  <h2 className="text-[32px] font-semibold leading-10 text-gray-900">Package Details</h2>
                  <div className="mt-2 border-t border-gray-200 pt-3" />
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Package Name</label>
                      <input
                        value={form.name}
                        onChange={(event) => setForm((cur) => ({ ...cur, name: event.target.value }))}
                        className="h-11 w-full rounded-[10px] border border-gray-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(event) => setForm((cur) => ({ ...cur, description: event.target.value }))}
                        className="h-24 w-full rounded-[10px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-[32px] font-semibold leading-10 text-gray-900">Add Products</h2>
                  <div className="mt-2 border-t border-gray-200 pt-3" />

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="h-10 w-full rounded-[10px] border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                      placeholder="Search name or phone"
                    />
                  </div>

                  {selectedRows.length > 0 && (
                    <div className="mt-3 rounded-[10px] bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-800">
                        {selectedRows.length} Products Selected
                      </p>
                      <p className="text-sm text-gray-500">
                        Product Total: ₦{productTotal.toLocaleString("en-NG")}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {filteredProducts.map((product) => {
                      const checked = Boolean(selected[product.id]);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-3 rounded-[10px] border p-3 ${
                            checked ? "border-primary-500 bg-green-50" : "border-gray-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProduct(product.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-green-200"
                          />
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{`₦${Number(product.price).toLocaleString("en-NG")}`}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => adjustQty(product.id, "dec")}
                              disabled={!checked}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white disabled:opacity-50"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center text-sm text-gray-700">
                              {selected[product.id] ?? 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustQty(product.id, "inc")}
                              disabled={!checked}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white disabled:opacity-50"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-[32px] font-semibold leading-10 text-gray-900">Set Package Price</h2>
                  <div className="mt-2 border-t border-gray-200 pt-3" />
                  <div className="rounded-[10px] bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Product Total</p>
                    <p className="text-[24px] font-semibold leading-7 text-gray-900">
                      ₦{productTotal.toLocaleString("en-NG")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Package Price</label>
                    <input
                      value={form.packagePrice}
                      onChange={(event) => setForm((cur) => ({ ...cur, packagePrice: event.target.value }))}
                      className="h-11 w-full rounded-[10px] border border-gray-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                      placeholder="800,000"
                      type="number"
                    />
                  </div>
                  <p className="mt-2 text-sm text-primary-600">
                    Use Product Total (₦{productTotal.toLocaleString("en-NG")})
                  </p>
                  <div className="mt-3 flex items-center justify-between rounded-[10px] bg-green-50 px-3 py-2">
                    <span className="text-sm text-primary-700">Customer Saves</span>
                    <span className="text-sm font-semibold text-primary-700">
                      ₦{savings.toLocaleString("en-NG")}
                    </span>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-[32px] font-semibold leading-10 text-gray-900">Review Package</h2>
                  <div className="mt-2 border-t border-gray-200 pt-3" />
                  <div className="rounded-[10px] bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">Product Total</p>
                    <p className="text-[24px] font-semibold leading-7 text-gray-900">
                      ₦{productTotal.toLocaleString("en-NG")}
                    </p>
                    <div className="mt-2 flex items-center justify-between rounded-[10px] bg-green-50 px-3 py-2">
                      <span className="text-sm text-primary-700">Customer Saves</span>
                      <span className="text-sm font-semibold text-primary-700">
                        ₦{savings.toLocaleString("en-NG")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-2 text-sm font-medium text-gray-800">Included Products</p>
                    <div className="space-y-2">
                      {selectedRows.map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-[10px] border border-gray-200 p-3">
                          <div className="flex items-center gap-3">
                            {row.imageUrl ? (
                              <img src={row.imageUrl} alt={row.name} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-100" />
                            )}
                            <p className="text-sm font-medium text-gray-900">{row.name}</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            {selected[row.id] ?? 1} x ₦{Number(row.price).toLocaleString("en-NG")}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            ₦{(Number(row.price) * (selected[row.id] ?? 1)).toLocaleString("en-NG")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    step === 0
                      ? router.push("/dashboards/vendor-hub/products")
                      : setStep((step - 1) as PackageStep)
                  }
                  className="h-10 rounded-[10px] bg-green-100 px-4 text-sm font-semibold text-primary-700"
                >
                  {step === 0 ? "Cancel" : "Back"}
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => canNext && setStep((step + 1) as PackageStep)}
                    disabled={!canNext}
                    className="h-10 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={createPackage}
                    disabled={saving}
                    className="h-10 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create Package"}
                  </button>
                )}
              </div>
            </Card>
          </div>

          {showSuccess && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
              <div className="w-full max-w-[360px] rounded-2xl bg-white p-6 text-center shadow-card">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-primary-600">
                  <CircleCheck className="h-6 w-6" />
                </div>
                <h3 className="text-[32px] font-semibold leading-10 text-gray-900">Package Created</h3>
                <p className="text-sm text-gray-500">
                  {created?.name ?? "Package"} has been added to your packages
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Link
                    href={
                      created
                        ? `/dashboards/vendor-hub/products/packages/${created.id}`
                        : "/dashboards/vendor-hub/products"
                    }
                    className="rounded-[10px] bg-primary-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    View Package
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuccess(false);
                      setStep(0);
                      setForm({ name: "", description: "", packagePrice: "" });
                      setSelected({});
                    }}
                    className="rounded-[10px] bg-green-100 px-4 py-2 text-sm font-semibold text-primary-700"
                  >
                    Create another
                  </button>
                  <Link href="/dashboards/vendor-hub/products" className="px-3 py-2 text-sm text-gray-600">
                    Done
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
