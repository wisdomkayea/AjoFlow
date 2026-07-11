"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";

function CreateProductContent() {
	const [form, setForm] = useState({ name: "", price: "" });
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
			presentError(new Error("Please select a valid image file"), "Invalid product image");
			e.target.value = "";
			return;
		}

		if (file.size > 1_500_000) {
			presentError(new Error("Image must be 1.5MB or less"), "Invalid product image");
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

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await apiFetch("/api/products", {
				method: "POST",
				body: JSON.stringify({
					name: form.name,
					price: Number(form.price),
					imageDataUrl: imageDataUrl ?? undefined
				})
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
		<div className="space-y-8">
			<PageHeader
				title="Create product"
				subtitle="Add a catalog item available for installment purchase."
				actions={
					<Link href="/dashboards/vendor-hub/products">
						<Button variant="secondary" size="sm">Back to products</Button>
					</Link>
				}
			/>

			<Card>
				<CardHeader>
					<SectionHeader
						title="New product"
						subtitle="Define a product name and its base price"
					/>
				</CardHeader>
				<CardBody>
					<form onSubmit={handleSubmit} className="grid gap-4 md:max-w-xl">
						<div>
							<Label htmlFor="pname">Product</Label>
							<Input
								id="pname"
								required
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="pprice">Price (₦)</Label>
							<Input
								id="pprice"
								type="number"
								min="1"
								required
								value={form.price}
								onChange={(e) => setForm({ ...form, price: e.target.value })}
							/>
						</div>
						<div>
							<Label htmlFor="pimage">Product image</Label>
							<Input id="pimage" type="file" accept="image/*" onChange={handleImageChange} />
							<p className="mt-1 text-xs text-ink/50">Optional. JPG, PNG, or WEBP up to 1.5MB.</p>
						</div>
						{imageDataUrl && (
							<div>
								<p className="mb-2 text-sm text-ink/70">Image preview</p>
								<img
									src={imageDataUrl}
									alt="Selected product"
									className="h-28 w-28 rounded-md border border-line object-cover"
								/>
							</div>
						)}
						<div>
							<Button type="submit" size="sm" disabled={loading}>
								{loading ? "Saving..." : "Save"}
							</Button>
						</div>
					</form>
				</CardBody>
			</Card>
		</div>
	);
}

function FallbackContent() {
	return (
		<Card className="p-6">
			<p className="text-sm text-ink/50">This area is available to vendor accounts.</p>
		</Card>
	);
}

export default function VendorHubCreateProductPage() {
	return (
		<DashboardShell>
			{(session) => (session.role === "VENDOR" ? <CreateProductContent /> : <FallbackContent />)}
		</DashboardShell>
	);
}

