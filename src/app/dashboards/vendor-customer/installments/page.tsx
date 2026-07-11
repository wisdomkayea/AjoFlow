"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { installmentDetailPathByRole } from "@/lib/role-routes";
import type { SessionUser } from "@/types";

interface InstallmentRow {
	id: string;
	totalAmount: string;
	amountPaid: string;
	balance: string;
	status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
	repaymentPreview?: {
		estimatedCompletionDate: string;
		estimatedMonthlyPayment: number;
	} | null;
	product: { name: string; vendor?: { name: string } };
}

interface Payment {
	id: string;
	amount: string;
	paidAt: string;
}

interface InstallmentDetail extends InstallmentRow {
	payments: Payment[];
}

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG")}`;
}

function CustomerContent({ role }: { role: SessionUser["role"] }) {
	const [installments, setInstallments] = useState<InstallmentDetail[]>([]);
	const [loading, setLoading] = useState(true);
	const { presentError } = useNotifier();

	useEffect(() => {
		apiFetch<InstallmentDetail[]>("/api/installments")
			.then(setInstallments)
			.catch((err) => presentError(err, "Could not load your installments"))
			.finally(() => setLoading(false));
	}, [presentError]);

	const summary = useMemo(() => {
		const totalPlans = installments.length;
		const activePlans = installments.filter((i) => i.status === "ACTIVE").length;
		const completedPlans = installments.filter((i) => i.status === "COMPLETED").length;
		const totalOutstanding = installments.reduce((sum, i) => sum + Number(i.balance), 0);
		const totalPaid = installments.reduce((sum, i) => sum + Number(i.amountPaid), 0);
		return {
			totalPlans,
			activePlans,
			completedPlans,
			totalOutstanding,
			totalPaid
		};
	}, [installments]);

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-44" />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<Card key={index} className="p-5">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="mt-3 h-8 w-28" />
						</Card>
					))}
				</div>
				<SkeletonText lines={6} />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="My installments"
				subtitle="Track what you have paid, what remains, and your projected completion dates."
			/>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<StatCard label="Total plans" value={String(summary.totalPlans)} />
				<StatCard label="Active plans" value={String(summary.activePlans)} accent />
				<StatCard label="Completed plans" value={String(summary.completedPlans)} />
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<StatCard label="Amount paid" value={naira(summary.totalPaid)} />
				<StatCard label="Outstanding balance" value={naira(summary.totalOutstanding)} />
			</div>

			<Card>
				<CardHeader>
					<SectionHeader
						title="Installment plans"
						subtitle="Open a plan to view repayment preview and payment history"
					/>
				</CardHeader>
				<CardBody className="divide-y divide-line">
					{installments.map((i) => (
						<Link
							key={i.id}
							href={installmentDetailPathByRole(role, i.id)}
								className="-mx-5 flex flex-col gap-2 px-5 py-3 text-sm hover:bg-forest-50 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="min-w-0">
								<p className="truncate font-medium">{i.product.name}</p>
								<p className="text-xs text-ink/40">
									{naira(i.amountPaid)} paid of {naira(i.totalAmount)}
								</p>
								{i.repaymentPreview && (
									<p className="text-xs text-ink/40">
										Estimated completion: {new Date(i.repaymentPreview.estimatedCompletionDate).toLocaleDateString("en-NG")}
									</p>
								)}
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

export default function VendorCustomerInstallmentsPage() {
	return (
		<DashboardShell>
			{(session: SessionUser) => <CustomerContent role={session.role} />}
		</DashboardShell>
	);
}
