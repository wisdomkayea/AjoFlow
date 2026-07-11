"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { groupListPathByRole, installmentListPathByRole } from "@/lib/role-routes";
import type { SessionUser } from "@/types";

function MemberView({ session }: { session: SessionUser }) {

	return (
		<Card className="p-6">
			<SectionHeader
				title={`Welcome back, ${session.name.split(" ")[0]}`}
				subtitle="Track your cycle contributions and payout position in real time."
			/>
			<CardBody className="px-0 pb-0 pt-4">
				<div className="flex flex-wrap items-center gap-3">
					<Link href={groupListPathByRole(session.role)}>
						<Button size="sm">View my groups</Button>
					</Link>
					<p className="text-xs text-ink/45">Last synced moments ago.</p>
				</div>
			</CardBody>
		</Card>
	);
}

export default function GroupMemberDashboardPage() {
	return (
		<DashboardShell>
			{(session: SessionUser) => (
				<div className="space-y-6">
					<PageHeader
						title={`Welcome Back, ${session.name}`}
						badge={<Badge tone="neutral">Group Member Dashboard</Badge>}
						subtitle="Monitor your contribution cycles and payout progress from one place."
					/>
					<MemberView session={session} />
				</div>
			)}
		</DashboardShell>
	);
}
