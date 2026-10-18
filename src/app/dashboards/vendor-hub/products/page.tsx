"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import {
  Check,
  CirclePlus,
  FileText,
  ImagePlus,
  MoreVertical,
  X,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  kind?: "STANDARD" | "PACKAGE";
}

interface InstallmentRow {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
  product: { id: string; name: string };
}

interface CreatedPackageResponse {
  id: string;
  name: string;
  productId: string;
  baseTotal: number;
  discountAmount: number;
  discountPercent: number;
  finalTotal: number;
  pricingMode: "NO_DISCOUNT" | "DISCOUNT" | "MANUAL";
  productCount: number;
  createdAt: string;
}

function naira(n: number | string) {
  return `N${Number(n).toLocaleString("en-NG")}`;
}

function inferCategory(name: string) {
  const normalized = name.toLowerCase();
  if (
    normalized.includes("iphone") ||
    normalized.includes("samsung") ||
    normalized.includes("xiaomi") ||
    normalized.includes("tecno") ||
    normalized.includes("redmi") ||
    normalized.includes("phone")
  ) {
    return "Phones";
  }
  if (normalized.includes("playstation") || normalized.includes("xbox")) {
    return "Game";
  }
  if (normalized.includes("crocs") || normalized.includes("shoe")) {
    return "Footwear";
  }
  if (normalized.includes("package") || normalized.includes("bundle")) {
    return "Package";
  }
  return "General";
}

function VendorProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "",
    price: "",
  });
  const [createImageDataUrl, setCreateImageDataUrl] = useState<string | null>(
    null,
  );
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packageName, setPackageName] = useState("");
  const [packagePricingMode, setPackagePricingMode] = useState<
    "NO_DISCOUNT" | "DISCOUNT" | "MANUAL"
  >("NO_DISCOUNT");
  const [packageDiscountPercent, setPackageDiscountPercent] = useState("");
  const [packageManualTotal, setPackageManualTotal] = useState("");
  const [savingPackage, setSavingPackage] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedPackageName, setSavedPackageName] = useState("");
  const [savedPackageCount, setSavedPackageCount] = useState(0);
  const { presentError, success } = useNotifier();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch<Product[]>("/api/products"),
      apiFetch<InstallmentRow[]>("/api/installments"),
    ])
      .then(([productsData, installmentsData]) => {
        setProducts(productsData);
        setInstallments(installmentsData);
      })
      .catch((err) => presentError(err, "Could not load products"))
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(load, [load]);

  const activeInstallmentsByProduct = useMemo(() => {
    const counts = new Map<string, number>();
    for (const installment of installments) {
      if (installment.status !== "ACTIVE") continue;
      const productId = installment.product?.id;
      if (!productId) continue;
      counts.set(productId, (counts.get(productId) ?? 0) + 1);
    }
    return counts;
  }, [installments]);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.includes(product.id)),
    [products, selectedIds],
  );

  const tableRows = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        category:
          product.kind === "PACKAGE" ? "Package" : inferCategory(product.name),
        activeInstallments: activeInstallmentsByProduct.get(product.id) ?? 0,
      })),
    [activeInstallmentsByProduct, products],
  );

  function toggleRow(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function clearSelection() {
    setSelectedIds([]);
    setSelectionMode(false);
    setShowPackageModal(false);
    setPackageName("");
    setPackagePricingMode("NO_DISCOUNT");
    setPackageDiscountPercent("");
    setPackageManualTotal("");
  }

  function removeSelectedProduct(id: string) {
    setSelectedIds((current) => current.filter((item) => item !== id));
  }

  function resetCreateForm() {
    setCreateForm({ name: "", category: "", price: "" });
    setCreateImageDataUrl(null);
  }

  async function handleCreateImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      setCreateImageDataUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      presentError(
        new Error("Please select a valid image file"),
        "Invalid product image",
      );
      event.target.value = "";
      return;
    }

    if (file.size > 1_500_000) {
      presentError(
        new Error("Image must be 1.5MB or less"),
        "Invalid product image",
      );
      event.target.value = "";
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Image read failed"));
      };
      reader.onerror = () => reject(new Error("Image read failed"));
      reader.readAsDataURL(file);
    });

    setCreateImageDataUrl(dataUrl);
  }

  const isCreateFormValid =
    createForm.name.trim().length >= 2 && Number(createForm.price) > 0;

  async function submitCreateProduct() {
    if (!isCreateFormValid || creatingProduct) {
      return;
    }

    setCreatingProduct(true);
    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          price: Number(createForm.price),
          imageDataUrl: createImageDataUrl ?? undefined,
        }),
      });
      success("Product created.");
      setShowCreateModal(false);
      resetCreateForm();
      load();
    } catch (error) {
      presentError(error, "Could not create product");
    } finally {
      setCreatingProduct(false);
    }
  }

  async function savePackage() {
    const trimmed = packageName.trim();
    if (!trimmed || selectedProducts.length === 0 || savingPackage) {
      return;
    }

    const discountPercent = Number(packageDiscountPercent || 0);
    const manualTotal = Number(packageManualTotal || 0);

    if (
      packagePricingMode === "DISCOUNT" &&
      (!Number.isFinite(discountPercent) ||
        discountPercent <= 0 ||
        discountPercent > 100)
    ) {
      presentError(
        new Error("Enter a discount percentage between 1 and 100"),
        "Invalid discount percent",
      );
      return;
    }

    if (packagePricingMode === "MANUAL" && manualTotal <= 0) {
      presentError(
        new Error("Enter a valid manual package price"),
        "Invalid package price",
      );
      return;
    }

    setSavingPackage(true);
    try {
      const created = await apiFetch<CreatedPackageResponse>("/api/packages", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          productIds: selectedProducts.map((product) => product.id),
          pricingMode: packagePricingMode,
          discountPercent:
            packagePricingMode === "DISCOUNT" ? discountPercent : undefined,
          finalPrice: packagePricingMode === "MANUAL" ? manualTotal : undefined,
        }),
      });

      setSavedPackageName(created.name);
      setSavedPackageCount(created.productCount);
      setShowPackageModal(false);
      setShowSuccessModal(true);
      setPackageName("");
      setPackageDiscountPercent("");
      setPackageManualTotal("");
      setPackagePricingMode("NO_DISCOUNT");
      load();
      success("Package created successfully");
    } catch (error) {
      presentError(error, "Could not create package");
    } finally {
      setSavingPackage(false);
    }
  }

  const packageBaseTotal = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) => sum + Number(product.price ?? 0),
        0,
      ),
    [selectedProducts],
  );

  const parsedDiscountPercent = Math.max(
    0,
    Number(packageDiscountPercent || 0),
  );
  const discountFinalTotal = Math.max(
    0,
    packageBaseTotal - (packageBaseTotal * parsedDiscountPercent) / 100,
  );
  const parsedManualTotal = Number(packageManualTotal || 0);
  const effectiveFinalTotal =
    packagePricingMode === "MANUAL"
      ? parsedManualTotal
      : packagePricingMode === "DISCOUNT"
        ? discountFinalTotal
        : packageBaseTotal;

  const isSaveDisabled =
    packageName.trim().length < 2 ||
    selectedProducts.length === 0 ||
    (packagePricingMode === "DISCOUNT" &&
      (!Number.isFinite(parsedDiscountPercent) ||
        parsedDiscountPercent <= 0 ||
        parsedDiscountPercent > 100)) ||
    (packagePricingMode === "MANUAL" &&
      (!Number.isFinite(parsedManualTotal) || parsedManualTotal <= 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Items you sell on installment"
        actions={
          <Button
            size="sm"
            className="h-10 rounded-lg px-4"
            onClick={() => setShowCreateModal(true)}
          >
            <CirclePlus className="h-4 w-4" />
            Add Products
          </Button>
        }
      />

      <Card className="overflow-hidden rounded-2xl border-line/90">
        <CardBody className="p-0">
          <div className="flex items-center justify-between border-b border-line bg-white px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-ink">All Products</h2>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                {selectedIds.length > 0
                  ? `${selectedIds.length} products selected`
                  : `${tableRows.length} products`}
              </span>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 text-ink/50 hover:bg-forest-50"
              aria-label="Toggle selection mode"
              onClick={() => {
                setSelectionMode((current) => {
                  const next = !current;
                  if (!next) {
                    setSelectedIds([]);
                  }
                  return next;
                });
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="w-full">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-line bg-canvas/50 text-xs text-ink/55">
                  {selectionMode && <th className="w-10 px-3 py-3" />}
                  <th className="px-4 py-3 font-medium sm:px-5">Products</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Categories
                  </th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">
                    Active Installments
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 7 }).map((_, index) => (
                    <tr
                      key={`product-skeleton-${index}`}
                      className="border-b border-line"
                    >
                      {selectionMode && <td className="px-3 py-4" />}
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-5 w-36" />
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 md:table-cell">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell">
                        <Skeleton className="h-5 w-8" />
                      </td>
                    </tr>
                  ))}

                {!loading &&
                  tableRows.map((product) => {
                    const checked = selectedIds.includes(product.id);
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-line text-sm text-ink/85"
                      >
                        {selectionMode && (
                          <td className="px-3 py-3.5 align-middle">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRow(product.id)}
                              className="h-4 w-4 rounded border-line text-violet-500 focus:ring-violet-300"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3.5 sm:px-5">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-500">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <p className="truncate font-medium text-ink">
                              {product.name}
                            </p>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3.5 text-ink/70 md:table-cell">
                          {product.category === "Package" ? (
                            <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                              Package
                            </span>
                          ) : (
                            product.category
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-ink/70">
                          {naira(product.price)}
                        </td>
                        <td className="hidden px-4 py-3.5 text-ink/70 lg:table-cell">
                          {product.activeInstallments}
                        </td>
                      </tr>
                    );
                  })}

                {!loading && tableRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={selectionMode ? 5 : 4}
                      className="px-4 py-10 text-center text-sm text-ink/50 sm:px-5"
                    >
                      No products yet. Add your first product to start assigning
                      installments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <p className="text-sm text-ink/60">Page 1 of 1</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-forest-200 bg-forest-50/50 px-4 py-3 sm:px-5">
              <p className="text-sm text-ink/70">
                {selectedIds.length} Candidates Selected
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={clearSelection}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => setShowPackageModal(true)}>
                  <CirclePlus className="h-4 w-4" />
                  Add to Package
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-3xl font-semibold text-ink">New Package</h2>
            <p className="mt-1 text-sm text-ink/50">
              A step by step &quot;pay small small&quot; plan
            </p>

            <div className="mt-5 rounded-lg bg-gold-50 px-4 py-2 text-center text-sm text-ink/70">
              These items would be added to the package
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-line bg-white px-3 py-2">
                <p className="text-xs text-ink/50">Items Total</p>
                <p className="ledger-figure text-sm font-semibold text-ink">
                  {naira(packageBaseTotal)}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-white px-3 py-2">
                <p className="text-xs text-ink/50">Pricing Mode</p>
                <select
                  value={packagePricingMode}
                  onChange={(event) =>
                    setPackagePricingMode(
                      event.target.value as
                        | "NO_DISCOUNT"
                        | "DISCOUNT"
                        | "MANUAL",
                    )
                  }
                  className="mt-1 h-8 w-full rounded-md border border-line px-2 text-xs text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                >
                  <option value="NO_DISCOUNT">No Discount</option>
                  <option value="DISCOUNT">Apply Discount (%)</option>
                  <option value="MANUAL">Manual Final Price</option>
                </select>
              </div>
              <div className="rounded-lg border border-line bg-white px-3 py-2">
                <p className="text-xs text-ink/50">Final Package Total</p>
                <p className="ledger-figure text-sm font-semibold text-forest-700">
                  {naira(Math.max(0, effectiveFinalTotal || 0))}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-gold-200 bg-gold-50 px-2 py-1 text-xs text-ink/75"
                  onClick={() => removeSelectedProduct(product.id)}
                >
                  {product.name}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>

            <label
              className="mt-4 block text-sm font-medium text-ink"
              htmlFor="package-name"
            >
              Package Name
            </label>
            <Input
              id="package-name"
              value={packageName}
              onChange={(event) => setPackageName(event.target.value)}
              placeholder="Sabi Package"
              className="mt-1 h-11 rounded-lg"
            />

            {packagePricingMode === "DISCOUNT" ? (
              <div className="mt-4">
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="package-discount-percent"
                >
                  Discount Amount (%)
                </label>
                <Input
                  id="package-discount-percent"
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={packageDiscountPercent}
                  onChange={(event) =>
                    setPackageDiscountPercent(event.target.value)
                  }
                  placeholder="10"
                  className="h-11 rounded-lg"
                />
              </div>
            ) : packagePricingMode === "MANUAL" ? (
              <div className="mt-4">
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="package-manual-total"
                >
                  Manual Final Price
                </label>
                <Input
                  id="package-manual-total"
                  type="number"
                  min="1"
                  value={packageManualTotal}
                  onChange={(event) =>
                    setPackageManualTotal(event.target.value)
                  }
                  placeholder="0"
                  className="h-11 rounded-lg"
                />
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                className="h-11 border-gold-400 text-gold-700 hover:bg-gold-50"
                onClick={() => setShowPackageModal(false)}
                disabled={savingPackage}
              >
                Cancel
              </Button>
              <Button
                className="h-11"
                onClick={savePackage}
                disabled={isSaveDisabled || savingPackage}
              >
                {savingPackage ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-card">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-line p-1 text-ink/55 hover:bg-forest-50"
              aria-label="Close package success"
              onClick={() => {
                setShowSuccessModal(false);
                clearSelection();
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-3xl font-semibold text-ink">
              {savedPackageName} Created
            </p>
            <p className="mt-2 text-sm text-ink/55">
              {savedPackageCount} products have been added to the{" "}
              {savedPackageName.toLowerCase()} package
            </p>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="text-4xl font-semibold text-ink">Add Product</h2>
            <p className="mt-1 text-base text-ink/45">
              The items you sell on installment
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="modal-product-name"
                >
                  Product Name
                </label>
                <Input
                  id="modal-product-name"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="iPhone 12 Pro"
                  className="h-11 rounded-lg"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="modal-product-category"
                >
                  Category
                </label>
                <Input
                  id="modal-product-category"
                  value={createForm.category}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  placeholder="Phones"
                  className="h-11 rounded-lg"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="modal-product-price"
                >
                  Price
                </label>
                <Input
                  id="modal-product-price"
                  type="number"
                  min="1"
                  value={createForm.price}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="120000"
                  className="h-11 rounded-lg"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="modal-product-image"
                >
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    id="modal-product-image"
                    type="file"
                    accept="image/*"
                    onChange={handleCreateImageChange}
                  />
                  <span className="hidden rounded-md bg-forest-50 px-2 py-1 text-xs text-forest-700 sm:inline-flex sm:items-center sm:gap-1">
                    <ImagePlus className="h-3.5 w-3.5" />
                    Upload
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink/50">
                  Optional. JPG, PNG, or WEBP up to 1.5MB.
                </p>
                {createImageDataUrl && (
                  <img
                    src={createImageDataUrl}
                    alt="Selected product"
                    className="mt-3 h-20 w-20 rounded-lg border border-line object-cover"
                  />
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                className="h-11 border-gold-400 text-gold-700 hover:bg-gold-50"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                disabled={creatingProduct}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11"
                onClick={submitCreateProduct}
                disabled={!isCreateFormValid || creatingProduct}
              >
                {creatingProduct ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FallbackContent() {
  return (
    <Card className="p-6">
      <p className="text-sm text-ink/50">
        This area is available to vendor accounts.
      </p>
    </Card>
  );
}

export default function VendorHubProductsPage() {
  return (
    <DashboardShell>
      {(session) =>
        session.role === "VENDOR" ? (
          <VendorProductsContent />
        ) : (
          <FallbackContent />
        )
      }
    </DashboardShell>
  );
}
