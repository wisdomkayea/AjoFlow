"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { ImagePlus } from "lucide-react";

function CreateProductContent() {
  const [form, setForm] = useState({ name: "", category: "", price: "" });
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { success, presentError } = useNotifier();
  const router = useRouter();

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImageDataUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      presentError(
        new Error("Please select a valid image file"),
        "Invalid product image",
      );
      e.target.value = "";
      return;
    }

    if (file.size > 1_500_000) {
      presentError(
        new Error("Image must be 1.5MB or less"),
        "Invalid product image",
      );
      e.target.value = "";
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

    setImageDataUrl(dataUrl);
  }

  const isFormValid = form.name.trim().length >= 2 && Number(form.price) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || loading) return;
    setLoading(true);
    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          imageDataUrl: imageDataUrl ?? undefined,
        }),
      });
      success("Product created.");
      router.push("/dashboards/vendor-hub/products");
    } catch (err) {
      presentError(err, "Could not create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[78vh]">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-black/20" />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        <Card className="rounded-2xl border-line bg-white p-6 shadow-card">
          <h1 className="text-4xl font-semibold text-ink">Add Product</h1>
          <p className="mt-1 text-base text-ink/45">
            The items you sell on installment
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-ink"
                htmlFor="product-name"
              >
                Product Name
              </label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="iPhone 12 Pro"
                className="h-11 rounded-lg"
                required
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-ink"
                htmlFor="product-category"
              >
                Category
              </label>
              <Input
                id="product-category"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
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
                htmlFor="product-price"
              >
                Price
              </label>
              <Input
                id="product-price"
                type="number"
                min="1"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="120000"
                className="h-11 rounded-lg"
                required
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-ink"
                htmlFor="product-image"
              >
                Product Image
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <span className="hidden rounded-md bg-forest-50 px-2 py-1 text-xs text-forest-700 sm:inline-flex sm:items-center sm:gap-1">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Upload
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                Optional. JPG, PNG, or WEBP up to 1.5MB.
              </p>
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Selected product"
                  className="mt-3 h-20 w-20 rounded-lg border border-line object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link href="/dashboards/vendor-hub/products">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full border-gold-400 text-gold-700 hover:bg-gold-50"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                className="h-11"
                disabled={!isFormValid || loading}
              >
                {loading ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
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

export default function VendorHubCreateProductPage() {
  return (
    <DashboardShell>
      {(session) =>
        session.role === "VENDOR" ? (
          <CreateProductContent />
        ) : (
          <FallbackContent />
        )
      }
    </DashboardShell>
  );
}
