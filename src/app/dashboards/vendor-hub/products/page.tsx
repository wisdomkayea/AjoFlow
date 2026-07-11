"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SkeletonText } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";

interface Product {
	id: string;
	name: string;
	price: string;
	imageUrl?: string | null;
}

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG")}`;
}

function VendorProductsContent() {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const { presentError } = useNotifier();

	const load = useCallback(() => {
		setLoading(true);
		apiFetch<Product[]>("/api/products")
			.then(setProducts)
			.catch((err) => presentError(err, "Could not load products"))
			.finally(() => setLoading(false));
	}, [presentError]);

	useEffect(load, [load]);

	return (
		<div className="space-y-8">
			<PageHeader
				title="Products"
				subtitle="Catalog items available for installment purchase"
				actions={
					<Link href="/dashboards/vendor-hub/products/create-product">
						<Button size="sm">Create product</Button>
					</Link>
				}
			/>

			<Card>
				<CardHeader>
					<SectionHeader
						title="Products"
						subtitle="Catalog items available for installment purchase"
					/>
				</CardHeader>
				<CardBody className="divide-y divide-line">
					{loading && <SkeletonText lines={4} />}
					{!loading && products.map((p) => (
						<div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
							<div className="flex items-center gap-3">
								{p.imageUrl ? (
									<img
										src={p.imageUrl}
										alt={p.name}
										className="h-10 w-10 rounded-md border border-line object-cover"
									/>
								) : (
									<div className="h-10 w-10 rounded-md border border-dashed border-line bg-canvas/30" />
								)}
								<span>{p.name}</span>
							</div>
							<span className="ledger-figure">{naira(p.price)}</span>
						</div>
					))}
					{!loading && products.length === 0 && (
						<p className="py-2 text-sm text-ink/40">No products yet — add one above.</p>
					)}
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

export default function VendorHubProductsPage() {
	return (
		<DashboardShell>
			{(session) => (session.role === "VENDOR" ? <VendorProductsContent /> : <FallbackContent />)}
		</DashboardShell>
	);
}

