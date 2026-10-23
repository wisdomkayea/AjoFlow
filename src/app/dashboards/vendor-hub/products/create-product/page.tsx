"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api-client";
import { useNotifier } from "@/components/ui/ToastNotification";
import { ArrowLeft, Check, ChevronDown, CircleCheck, ImagePlus } from "lucide-react";

type CreateStep = 0 | 1 | 2;

interface CreatedProduct {
  id: string;
  name: string;
  price: string;
}

function StepRail({ step }: { step: CreateStep }) {
  const rows = [
    {
      title: "Product information",
      desc: "Tell us about the product you want to sell.",
    },
    {
      title: "Pricing",
      desc: "Set your selling price and configure your payment options.",
    },
    {
      title: "Review",
      desc: "Set your selling price and configure your payment options.",
    },
  ];

  return (
    <div className="w-full max-w-[260px] space-y-3">
      {rows.map((row, index) => {
        const complete = index < step;
        const current = index === step;
        return (
          <div key={row.title} className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                complete || current ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${current ? "text-primary-600" : "text-gray-700"}`}>
                {row.title}
              </p>
              <p className={`text-xs ${current ? "text-primary-600" : "text-gray-500"}`}>{row.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreateProductContent() {
  const router = useRouter();
  const { presentError } = useNotifier();
  const [step, setStep] = useState<CreateStep>(0);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<CreatedProduct | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
  });

  const infoValid = form.name.trim().length >= 2 && form.category.trim().length > 0;
  const pricingValid = Number(form.price) > 0;

  const canNext = step === 0 ? infoValid : step === 1 ? pricingValid : true;

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImageDataUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      presentError(new Error("Please select a valid image file"), "Invalid product image");
      e.target.value = "";
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Image read failed"));
      };
      reader.onerror = () => reject(new Error("Image read failed"));
      reader.readAsDataURL(file);
    });
    setImageDataUrl(dataUrl);
  }

  async function createProduct() {
    if (saving) return;
    setSaving(true);
    try {
      const created = await apiFetch<CreatedProduct>("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          imageDataUrl: imageDataUrl ?? undefined,
        }),
      });
      setCreatedProduct(created);
      setShowSuccess(true);
    } catch (error) {
      presentError(error, "Could not create product");
    } finally {
      setSaving(false);
    }
  }

  const reviewPrice = useMemo(() => Number(form.price || 0).toLocaleString("en-NG"), [form.price]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/dashboards/vendor-hub/products"
          className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[28px] font-bold leading-[48px] text-gray-900">Add Products</h1>
          <p className="text-sm text-gray-500">Combine products you normally sell together</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <StepRail step={step} />

        <Card className="rounded-2xl border border-gray-200 p-4 shadow-sm">
          {step === 0 && (
            <div>
              <h2 className="text-[32px] font-semibold leading-10 text-gray-900">Product Information</h2>
              <div className="mt-2 border-t border-gray-200 pt-3" />

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((cur) => ({ ...cur, name: event.target.value }))}
                    className="h-11 w-full rounded-[10px] border border-gray-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(event) => setForm((cur) => ({ ...cur, category: event.target.value }))}
                      className="h-11 w-full appearance-none rounded-[10px] border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                    >
                      <option value="">Select category</option>
                      <option value="Mobile Phone">Mobile Phone</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Jewelry">Jewelry</option>
                      <option value="Others">Others</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((cur) => ({ ...cur, description: event.target.value }))}
                    className="h-28 w-full rounded-[10px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Package Image (Optional)</label>
                  <label className="flex cursor-pointer items-center justify-between rounded-[10px] border border-dashed border-gray-300 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-gray-100 p-2 text-gray-500">
                        <ImagePlus className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Tap to Upload</p>
                        <p className="text-xs text-gray-500">PNG, JPG, 1MB max.</p>
                      </div>
                    </div>
                    <span className="rounded-[10px] border border-primary-600 px-4 py-1 text-sm font-medium text-primary-600">
                      Upload
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-[32px] font-semibold leading-10 text-gray-900">Product Information</h2>
              <div className="mt-2 border-t border-gray-200 pt-3" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount</label>
                <input
                  value={form.price}
                  onChange={(event) => setForm((cur) => ({ ...cur, price: event.target.value }))}
                  className="h-11 w-full rounded-[10px] border border-gray-200 px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-green-100"
                  placeholder="₦1,200,000"
                  type="number"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-[32px] font-semibold leading-10 text-gray-900">Review</h2>
              <div className="mt-2 border-t border-gray-200 pt-3" />
              <div className="rounded-[10px] bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{form.name || "-"}</p>
                  <p className="text-sm text-gray-500">{form.category || "-"}</p>
                  <p className="text-sm font-semibold text-gray-900">₦{reviewPrice}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-1.5 text-sm font-medium text-gray-700">Description</p>
                <div className="rounded-[10px] border border-gray-200 p-3 text-sm text-gray-700">
                  {form.description || "-"}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => (step === 0 ? router.push("/dashboards/vendor-hub/products") : setStep((step - 1) as CreateStep))}
              className="h-10 rounded-[10px] bg-green-100 px-4 text-sm font-semibold text-primary-700"
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={() => canNext && setStep((step + 1) as CreateStep)}
                disabled={!canNext}
                className="h-10 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={createProduct}
                disabled={saving}
                className="h-10 rounded-[10px] bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Product →"}
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
            <h3 className="text-[32px] font-semibold leading-10 text-gray-900">Product Added</h3>
            <p className="text-sm text-gray-500">Your product has been added successfully</p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Link
                href={
                  createdProduct
                    ? `/dashboards/vendor-hub/products/${createdProduct.id}`
                    : "/dashboards/vendor-hub/products"
                }
                className="rounded-[10px] bg-primary-500 px-4 py-2 text-sm font-semibold text-white"
              >
                View Product
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  setForm({ name: "", category: "", description: "", price: "" });
                  setImageDataUrl(null);
                  setStep(0);
                }}
                className="rounded-[10px] bg-green-100 px-4 py-2 text-sm font-semibold text-primary-700"
              >
                Create another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateVendorProductPage() {
  return <DashboardShell>{() => <CreateProductContent />}</DashboardShell>;
}
