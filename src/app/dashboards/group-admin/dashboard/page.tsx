"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api-client";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { groupListPathByRole } from "@/lib/role-routes";
import type { SessionUser } from "@/types";

interface AdminDashboardData {
	totalGroups: number;
	totalMembers: number;
	totalContributions: number;
	pendingContributions: number;
	defaulters: { id: string; name: string; groupName: string }[];
	nextPayouts: { groupId: string; groupName: string; memberName: string; payoutOrder: number }[];
}

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function AdminView() {
	const [data, setData] = useState<AdminDashboardData | null>(null);
	useEffect(() => {
		apiFetch<AdminDashboardData>("/api/dashboard").then(setData);
	}, []);

	if (!data) return <LoadingBlock />;

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<StatCard label="Groups" value={String(data.totalGroups)} />
				<StatCard label="Members" value={String(data.totalMembers)} />
				<StatCard label="Total contributed" value={naira(data.totalContributions)} accent />
				<StatCard label="Pending contributions" value={String(data.pendingContributions)} />
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card className="p-5">
					<SectionHeader
						title="Next payouts"
						subtitle="Upcoming beneficiaries across your contribution circles"
					/>
					<CardBody className="space-y-3 px-0 pb-0 pt-4">
						{data.nextPayouts.length === 0 && (
							<p className="rounded-md border border-dashed border-line/80 px-3 py-6 text-center text-sm text-ink/40">
								No pending payouts across your groups.
							</p>
						)}
						{data.nextPayouts.map((p) => (
							<Link
								key={p.groupId}
								href={groupListPathByRole("ADMIN") + `/${p.groupId}`}
								className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-forest-300 hover:bg-forest-50/45"
							>
								<div>
									<p className="text-sm font-medium">{p.groupName}</p>
									<p className="text-xs text-ink/45">Turn #{p.payoutOrder} · {p.memberName}</p>
								</div>
								<Badge tone="pending">pending</Badge>
							</Link>
						))}
					</CardBody>
				</Card>

				<Card className="p-5">
					<SectionHeader
						title="Defaulters"
						subtitle="Members with missed contributions this cycle"
					/>
					<CardBody className="space-y-3 px-0 pb-0 pt-4">
						{data.defaulters.length === 0 && (
							<p className="rounded-md border border-dashed border-line/80 px-3 py-6 text-center text-sm text-ink/40">
								No missed contributions recorded.
							</p>
						)}
						{data.defaulters.map((d) => (
							<div key={d.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
								<div>
									<p className="text-sm font-medium">{d.name}</p>
									<p className="text-xs text-ink/45">{d.groupName}</p>
								</div>
								<Badge tone="missed">missed</Badge>
							</div>
						))}
					</CardBody>
				</Card>
			</div>
		</div>
	);
}

function LoadingBlock() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card key={index} className="p-5">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="mt-3 h-8 w-28" />
					</Card>
				))}
			</div>
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-36" />
					</CardHeader>
					<CardBody className="space-y-3">
						{Array.from({ length: 3 }).map((_, index) => (
							<div key={index} className="rounded-md border border-line px-3 py-2">
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="mt-2 h-3 w-1/2" />
							</div>
						))}
					</CardBody>
				</Card>

				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-32" />
					</CardHeader>
					<CardBody className="space-y-3">
						{Array.from({ length: 3 }).map((_, index) => (
							<div key={index} className="rounded-md border border-line px-3 py-2">
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="mt-2 h-3 w-1/2" />
							</div>
						))}
					</CardBody>
				</Card>
			</div>
		</div>
	);
}

export default function GroupAdminDashboardPage() {
	return (
		<DashboardShell>
			{(session: SessionUser) => (
				<div className="space-y-6">
					<PageHeader
						title={`Welcome Back, ${session.name}`}
						badge={<Badge tone="neutral">Group Admin Dashboard</Badge>}
						subtitle="Monitor contribution cycles, payout schedules, and group performance from one place."
					/>
					<AdminView />
				</div>
			)}
		</DashboardShell>
	);
}
