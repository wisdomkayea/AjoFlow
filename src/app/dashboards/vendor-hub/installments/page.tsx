"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { installmentDetailPathByRole } from "@/lib/role-routes";
import type { SessionUser } from "@/types";

interface Product {
	id: string;
	name: string;
	price: string;
}

interface InstallmentRow {
	id: string;
	totalAmount: string;
	amountPaid: string;
	balance: string;
	status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
	product: { name: string };
	customer?: { name: string };
}

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG")}`;
}

function VendorContent({ role }: { role: SessionUser["role"] }) {
	const [products, setProducts] = useState<Product[]>([]);
	const [installments, setInstallments] = useState<InstallmentRow[]>([]);
	const [loading, setLoading] = useState(true);
	const { presentError } = useNotifier();

	const load = useCallback(() => {
		Promise.all([apiFetch<Product[]>("/api/products"), apiFetch<InstallmentRow[]>("/api/installments")])
			.then(([productsData, installmentsData]) => {
				setProducts(productsData);
				setInstallments(installmentsData);
			})
			.catch((err) => {
				presentError(err, "Could not load vendor dashboard");
			})
			.finally(() => {
				setLoading(false);
			});
	}, [presentError]);
	useEffect(load, [load]);

	if (loading) {
		return (
			<div className="space-y-8">
				<Skeleton className="h-8 w-56" />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<Card key={index} className="p-5">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="mt-3 h-8 w-28" />
						</Card>
					))}
				</div>
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-28" />
					</CardHeader>
					<CardBody>
						<SkeletonText lines={4} />
					</CardBody>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader
				title="Installments"
				subtitle="Monitor installment plans and receivables in one workflow."
				actions={
					<Link href="/dashboards/vendor-hub/installments/create-installment">
						<Button size="sm">Create installment plan</Button>
					</Link>
				}
			/>

			<Card>
				<CardHeader>
					<SectionHeader
						title="Installment plans"
						subtitle="Track active and completed customer agreements"
					/>
				</CardHeader>
				<CardBody className="divide-y divide-line">
					{installments.map((i) => (
						<Link
							key={i.id}
							href={installmentDetailPathByRole(role, i.id)}
							className="-mx-5 flex flex-col gap-2 px-5 py-3 text-sm hover:bg-forest-50 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p className="font-medium">{i.product.name}{i.customer ? ` · ${i.customer.name}` : ""}</p>
								<p className="text-xs text-ink/40">
									{naira(i.amountPaid)} paid of {naira(i.totalAmount)}
								</p>
							</div>
							<div className="self-start sm:self-auto">
								<Badge tone={i.status.toLowerCase() as any}>{i.status.toLowerCase()}</Badge>
							</div>
						</Link>
					))}
					{installments.length === 0 && <p className="py-2 text-sm text-ink/40">No installment plans yet.</p>}
				</CardBody>
			</Card>
		</div>
	);
}

function CustomerContent({ role }: { role: SessionUser["role"] }) {
	const [installments, setInstallments] = useState<InstallmentRow[]>([]);
	const [loading, setLoading] = useState(true);
	const { presentError } = useNotifier();

	useEffect(() => {
		apiFetch<InstallmentRow[]>("/api/installments")
			.then(setInstallments)
			.catch((err) => presentError(err, "Could not load your installments"))
			.finally(() => setLoading(false));
	}, [presentError]);

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-44" />
				<div className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 4 }).map((_, index) => (
						<Card key={index} className="p-5">
							<Skeleton className="h-6 w-2/3" />
							<Skeleton className="mt-2 h-4 w-1/2" />
							<Skeleton className="mt-4 h-6 w-24" />
						</Card>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="My installments"
				subtitle="Monitor what you have paid, what remains, and your plan status."
			/>
			<div className="grid gap-4 md:grid-cols-2">
				{installments.map((i) => (
					<Link key={i.id} href={installmentDetailPathByRole(role, i.id)}>
						<Card className="p-5 transition-colors hover:border-forest-300 hover:bg-forest-50/35">
							<p className="font-display text-lg">{i.product.name}</p>
							<p className="mt-1 text-sm text-ink/50">
								{naira(i.amountPaid)} paid of {naira(i.totalAmount)}
							</p>
							<div className="mt-3 flex items-center justify-between">
								<span className="ledger-figure text-forest-600 font-semibold">{naira(i.balance)} left</span>
								<Badge tone={i.status.toLowerCase() as any}>{i.status.toLowerCase()}</Badge>
							</div>
						</Card>
					</Link>
				))}
				{installments.length === 0 && (
					<Card className="p-8 text-center md:col-span-2">
						<p className="text-sm text-ink/40">No installment plans assigned to you yet.</p>
					</Card>
				)}
			</div>
		</div>
	);
}

export default function VendorHubInstallmentsPage() {
	return (
		<DashboardShell>
			{(session: SessionUser) =>
				session.role === "VENDOR" ? <VendorContent role={session.role} /> : <CustomerContent role={session.role} />}
		</DashboardShell>
	);
}
