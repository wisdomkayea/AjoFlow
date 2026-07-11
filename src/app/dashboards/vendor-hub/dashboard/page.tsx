"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api-client";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import type { SessionUser } from "@/types";

interface VendorDashboardData {
	totalCustomers: number;
	totalRevenue: number;
	outstandingPayments: number;
	analytics: {
		totalInstallments: number;
		activeInstallments: number;
		completedInstallments: number;
		defaultedInstallments: number;
		totalBilled: number;
		totalPaid: number;
		averageTicketSize: number;
		collectionRatePct: number;
		defaultRatePct: number;
		paymentsLast30Days: number;
		newPlansLast30Days: number;
		recentPayments: Array<{
			id: string;
			amount: number;
			paidAt: string;
			customerName: string;
			productName: string;
		}>;
	};
}

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function VendorView() {
	const [data, setData] = useState<VendorDashboardData | null>(null);
	useEffect(() => {
		apiFetch<VendorDashboardData>("/api/dashboard").then(setData);
	}, []);

	if (!data) return <LoadingBlock />;

	const collectionWidth = Math.max(0, Math.min(100, data.analytics.collectionRatePct));
	const defaultWidth = Math.max(0, Math.min(100, data.analytics.defaultRatePct));
	const recentPayments = data.analytics.recentPayments ?? [];

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard label="Customers" value={String(data.totalCustomers)} />
				<StatCard label="Total revenue" value={naira(data.totalRevenue)} accent />
				<StatCard label="Outstanding" value={naira(data.outstandingPayments)} />
			</div>

			<Card className="p-4 sm:p-5">
				<SectionHeader
					title="Vendor analytics"
					subtitle="Operational performance, portfolio quality, and recent repayment activity"
				/>
				<CardBody className="space-y-5 px-0 pb-0 pt-4">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard label="Total plans" value={String(data.analytics.totalInstallments)} />
						<StatCard label="Active plans" value={String(data.analytics.activeInstallments)} />
						<StatCard label="Completed plans" value={String(data.analytics.completedInstallments)} />
						<StatCard label="Defaulted plans" value={String(data.analytics.defaultedInstallments)} />
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						<StatCard label="Total billed" value={naira(data.analytics.totalBilled)} />
						<StatCard label="Average ticket size" value={naira(data.analytics.averageTicketSize)} />
						<StatCard label="Collections (last 30 days)" value={naira(data.analytics.paymentsLast30Days)} accent />
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="rounded-xl border border-line p-4">
							<div className="flex items-center justify-between text-sm">
								<span className="text-ink/60">Collection rate</span>
								<span className="font-medium text-forest-700">{data.analytics.collectionRatePct.toFixed(1)}%</span>
							</div>
							<div className="mt-2 h-2 overflow-hidden rounded-full bg-forest-50">
								<div className="h-full rounded-full bg-forest-500" style={{ width: `${collectionWidth}%` }} />
							</div>
							<p className="mt-2 text-xs text-ink/50">
								{naira(data.analytics.totalPaid)} paid out of {naira(data.analytics.totalBilled)} billed
							</p>
						</div>

						<div className="rounded-xl border border-line p-4">
							<div className="flex items-center justify-between text-sm">
								<span className="text-ink/60">Default rate</span>
								<span className="font-medium text-red-600">{data.analytics.defaultRatePct.toFixed(1)}%</span>
							</div>
							<div className="mt-2 h-2 overflow-hidden rounded-full bg-red-50">
								<div className="h-full rounded-full bg-red-500" style={{ width: `${defaultWidth}%` }} />
							</div>
							<p className="mt-2 text-xs text-ink/50">
								{data.analytics.defaultedInstallments} of {data.analytics.totalInstallments} plans are defaulted
							</p>
						</div>
					</div>

					<div className="rounded-xl border border-line p-4">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm font-medium text-ink/75">Recent collections</p>
							<p className="text-xs text-ink/50">New plans (30 days): {data.analytics.newPlansLast30Days}</p>
						</div>
						<div className="mt-3 divide-y divide-line/70">
							{recentPayments.length === 0 && (
								<p className="text-sm text-ink/50">No payments recorded yet.</p>
							)}
							{recentPayments.map((payment) => (
								<div key={payment.id} className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3">
									<div className="min-w-0">
										<p className="truncate font-medium text-ink/80">{payment.customerName} · {payment.productName}</p>
										<p className="text-xs text-ink/50">{new Date(payment.paidAt).toLocaleDateString("en-NG")}</p>
									</div>
									<span className="ledger-figure shrink-0 text-sm font-medium text-forest-700 sm:text-base">{naira(payment.amount)}</span>
								</div>
							))}
						</div>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}

function LoadingBlock() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Card key={index} className="p-5">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="mt-3 h-8 w-28" />
					</Card>
				))}
			</div>
			<Card>
				<CardBody className="space-y-3 p-5">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
				</CardBody>
			</Card>
		</div>
	);
}

export default function VendorHubDashboardPage() {
	return (
		<DashboardShell>
			{(session: SessionUser) => (
				<div className="space-y-6">
					<PageHeader
						title={`Welcome Back, ${session.name}`}
						badge={<Badge tone="neutral">Vendor Dashboard</Badge>}
						subtitle="Monitor customer counts, revenue, and outstanding balances from one place."
					/>
					<VendorView />
				</div>
			)}
		</DashboardShell>
	);
}
