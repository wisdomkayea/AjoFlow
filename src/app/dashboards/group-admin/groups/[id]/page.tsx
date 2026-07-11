"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { RotationWheel } from "@/components/groups/RotationWheel";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch, ClientApiError } from "@/lib/api-client";
import { groupListPathByRole } from "@/lib/role-routes";
import type { SessionUser } from "@/types";

interface Member {
	id: string;
	payoutOrder: number;
	user: { id: string; name: string; email: string };
}

interface GroupDetails {
	id: string;
	name: string;
	contributionAmount: string;
	contributionGoal?: string | number;
	frequency: string;
	totalMembers: number;
	members: Member[];
	admin: { id: string; name: string };
}

interface Contribution {
	id: string;
	amount: string;
	status: "PAID" | "PENDING" | "MISSED";
	createdAt: string;
	member: { id: string; name: string };
}

interface ContributionWithCycle extends Contribution {
	cycleNumber: number;
}

interface PayoutRow {
	id: string;
	payoutOrder: number;
	status: "PENDING" | "COMPLETED";
	member: { id: string; name: string };
}

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG")}`;
}

function AddMemberForm({ groupId, onDone }: { groupId: string; onDone: () => void }) {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const { success, presentError } = useNotifier();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			const query = email.trim().toLowerCase();
			const users = await apiFetch<{ id: string }[]>(
				`/api/users?role=MEMBER&q=${encodeURIComponent(query)}`
			);
			if (users.length === 0) throw new ClientApiError("No user found with that email", 404);
			await apiFetch(`/api/groups/${groupId}/members`, {
				method: "POST",
				body: JSON.stringify({ userId: users[0].id })
			});
			setEmail("");
			success("Member added to group.");
			onDone();
		} catch (err) {
			presentError(err, "Could not add member");
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
			<Input
				placeholder="member@email.com"
				type="email"
				required
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				className="w-full"
			/>
			<Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto">
				{loading ? "Adding…" : "Add"}
			</Button>
		</form>
	);
}

function RecordContributionForm({
	groupId,
	members,
	expectedAmount,
	disabledMemberIds,
	onDone
}: {
	groupId: string;
	members: Member[];
	expectedAmount: string;
	disabledMemberIds: Set<string>;
	onDone: () => void;
}) {
	const [memberId, setMemberId] = useState(
		() => members.find((member) => !disabledMemberIds.has(member.user.id))?.user.id ?? ""
	);
	const [status, setStatus] = useState<"PAID" | "MISSED">("PAID");
	const [loading, setLoading] = useState(false);
	const { success, error, presentError } = useNotifier();

	const hasSelectableMember = members.some((member) => !disabledMemberIds.has(member.user.id));
	const unpaidMembersCount = members.filter((member) => !disabledMemberIds.has(member.user.id)).length;

	useEffect(() => {
		const currentMemberIsSelectable =
			memberId.length > 0 && members.some((member) => member.user.id === memberId && !disabledMemberIds.has(member.user.id));

		if (currentMemberIsSelectable) {
			return;
		}

		const nextSelectableMember = members.find((member) => !disabledMemberIds.has(member.user.id));
		setMemberId(nextSelectableMember?.user.id ?? "");
	}, [memberId, members, disabledMemberIds]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!memberId) {
			error("All members have already been recorded as paid for this cycle.");
			return;
		}

		setLoading(true);
		try {
			await apiFetch("/api/contributions", {
				method: "POST",
				body: JSON.stringify({ groupId, memberId, amount: Number(expectedAmount), status })
			});
			success("Contribution recorded.");
			onDone();
		} catch (err) {
			presentError(err, "Could not record contribution");
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
			<div>
				<Label htmlFor="member">Member</Label>
				<select
					id="member"
					className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm sm:min-w-[12rem]"
					value={memberId}
					onChange={(e) => setMemberId(e.target.value)}
				>
					{members.map((m) => (
						<option key={m.id} value={m.user.id} disabled={disabledMemberIds.has(m.user.id)}>
							{m.user.name}
						</option>
					))}
				</select>
			</div>
			<div>
				<Label htmlFor="status">Status</Label>
				<select
					id="status"
					className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm sm:min-w-[8rem]"
					value={status}
					onChange={(e) => setStatus(e.target.value as "PAID" | "MISSED")}
				>
					<option value="PAID">Paid</option>
					<option value="MISSED">Missed</option>
				</select>
			</div>

			<p className="mb-2 w-full text-xs text-ink/40 sm:w-auto">Amount fixed at {naira(expectedAmount)}</p>
			<Button type="submit" size="sm" disabled={loading || members.length === 0 || !hasSelectableMember}>
				{loading ? "Recording…" : "Record"}
			</Button>
			<p className="mb-2 w-full text-xs text-ink/50 sm:w-auto">
				{unpaidMembersCount} member{unpaidMembersCount === 1 ? "" : "s"} still unpaid this cycle.
			</p>
		</form>
	);
}

function GroupDetailContent({ session, groupId }: { session: SessionUser; groupId: string }) {
	const [group, setGroup] = useState<GroupDetails | null>(null);
	const [contributions, setContributions] = useState<Contribution[] | null>(null);
	const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);
	const [selectedCycle, setSelectedCycle] = useState(1);
	const { success, error, presentError } = useNotifier();

	const load = useCallback(() => {
		Promise.all([
			apiFetch<GroupDetails>(`/api/groups/${groupId}`),
			apiFetch<Contribution[]>(`/api/groups/${groupId}/contributions`),
			apiFetch<PayoutRow[]>(`/api/groups/${groupId}/payouts`)
		])
			.then(([groupData, contributionData, payoutData]) => {
				setGroup(groupData);
				setContributions(contributionData);
				setPayouts(payoutData);
			})
			.catch((err) => {
				presentError(err, "Could not load group details");
			});
	}, [groupId, presentError]);

	useEffect(load, [load]);

	const isAdmin = session.role === "ADMIN" && group?.admin.id === session.sub;

	const completedPayoutsCount = useMemo(
		() => payouts?.filter((payout) => payout.status === "COMPLETED").length ?? 0,
		[payouts]
	);

	const requiredPaidCountPerMember = completedPayoutsCount + 1;

	const paidContributionCountByMember = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const contribution of contributions ?? []) {
			if (contribution.status !== "PAID") continue;
			counts[contribution.member.id] = (counts[contribution.member.id] ?? 0) + 1;
		}
		return counts;
	}, [contributions]);

	const disabledMemberIds = useMemo(
		() =>
			new Set(
				(group?.members ?? [])
					.filter((member) => (paidContributionCountByMember[member.user.id] ?? 0) >= requiredPaidCountPerMember)
					.map((member) => member.user.id)
			),
		[group?.members, paidContributionCountByMember, requiredPaidCountPerMember]
	);

	const allMembersPaidForCurrentCycle = useMemo(
		() =>
			(group?.members.length ?? 0) > 0 &&
			(group?.members ?? []).every(
				(member) => (paidContributionCountByMember[member.user.id] ?? 0) >= requiredPaidCountPerMember
			),
		[group?.members, paidContributionCountByMember, requiredPaidCountPerMember]
	);

	const contributionsWithCycle = useMemo<ContributionWithCycle[]>(() => {
		if (!contributions) return [];

		const chronological = [...contributions].sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		);
		const paidCountByMember: Record<string, number> = {};
		const cycleByContributionId = new Map<string, number>();

		for (const contribution of chronological) {
			const paidCount = paidCountByMember[contribution.member.id] ?? 0;
			const cycleNumber = paidCount + 1;
			cycleByContributionId.set(contribution.id, cycleNumber);

			if (contribution.status === "PAID") {
				paidCountByMember[contribution.member.id] = paidCount + 1;
			}
		}

		return contributions.map((contribution) => ({
			...contribution,
			cycleNumber: cycleByContributionId.get(contribution.id) ?? 1
		}));
	}, [contributions]);

	const visibleContributions = useMemo<ContributionWithCycle[]>(() => {
		const paidShownByMemberAndCycle = new Set<string>();
		return contributionsWithCycle.filter((contribution) => {
			if (contribution.status !== "PAID") return true;

			const key = `${contribution.member.id}:${contribution.cycleNumber}`;
			if (paidShownByMemberAndCycle.has(key)) return false;
			paidShownByMemberAndCycle.add(key);
			return true;
		});
	}, [contributionsWithCycle]);

	const maxCycle = useMemo(
		() => Math.max(requiredPaidCountPerMember, ...visibleContributions.map((contribution) => contribution.cycleNumber), 1),
		[requiredPaidCountPerMember, visibleContributions]
	);

	useEffect(() => {
		setSelectedCycle((prev) => {
			if (prev > maxCycle) return maxCycle;
			if (prev < 1) return 1;
			return prev;
		});
	}, [maxCycle]);

	const pagedContributions = useMemo(
		() => visibleContributions.filter((contribution) => contribution.cycleNumber === selectedCycle),
		[selectedCycle, visibleContributions]
	);

	async function generateSchedule() {
		try {
			await apiFetch(`/api/groups/${groupId}/payouts`, { method: "POST" });
			success("Payout schedule generated.");
			load();
		} catch (err) {
			presentError(err, "Could not generate payout schedule");
		}
	}

	async function completeNext() {
		if (!allMembersPaidForCurrentCycle) {
			error("Could not complete payout till every member completes payment");
			return;
		}

		try {
			await apiFetch("/api/payouts/complete", { method: "POST", body: JSON.stringify({ groupId }) });
			success("Payout marked as complete.");
			load();
		} catch (err) {
			presentError(err, "Could not complete payout");
		}
	}

	if (!group) {
		return (
			<div className="space-y-8">
				<div>
					<Skeleton className="h-8 w-56" />
					<Skeleton className="mt-2 h-4 w-72" />
				</div>

				<div className="grid gap-6 md:grid-cols-[280px_1fr]">
					<Card className="p-6 flex flex-col items-center">
						<Skeleton className="h-48 w-48 rounded-full" />
						<Skeleton className="mt-6 h-9 w-full" />
					</Card>

					<div className="space-y-6">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							{Array.from({ length: 3 }).map((_, index) => (
								<Card key={index} className="p-5">
									<Skeleton className="h-3 w-16" />
									<Skeleton className="mt-3 h-8 w-14" />
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
				</div>
			</div>
		);
	}

	const wheelMembers =
		payouts && payouts.length > 0
			? payouts.map((p) => ({ id: p.id, name: p.member.name, payoutOrder: p.payoutOrder, status: p.status }))
			: group.members.map((m) => ({ id: m.id, name: m.user.name, payoutOrder: m.payoutOrder, status: "PENDING" as const }));

	const contributionGoal =
		group.contributionGoal ?? Number(group.contributionAmount) * Number(group.totalMembers || 0);

	return (
		<div className="space-y-8">
			<PageHeader
				title={group.name}
				subtitle={`${group.frequency.toLowerCase()} contribution cycle · ${naira(group.contributionAmount)} per member · Contribution goal: ${naira(contributionGoal)}`}
				actions={
					<Link href={groupListPathByRole(session.role)}>
						<Button variant="secondary" size="sm">
							<ArrowLeft className="h-4 w-4" /> Back to groups
						</Button>
					</Link>
				}
			/>

			<div className="grid gap-6 md:grid-cols-[280px_1fr]">
				<Card className="flex flex-col items-center p-6">
					<SectionHeader title="Payout wheel" subtitle="Rotation order and completion progress" />
					<div className="pt-4" />
					<RotationWheel members={wheelMembers} />
					{isAdmin && (
						<div className="mt-6 w-full space-y-2">
							{(!payouts || payouts.length === 0) && (
								<Button size="sm" className="w-full" onClick={generateSchedule}>
									Generate payout schedule
								</Button>
							)}
							{payouts && payouts.length > 0 && (
								<Button size="sm" className="w-full" onClick={completeNext}>
									Mark next payout complete
								</Button>
							)}
						</div>
					)}
				</Card>

				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<StatCard label="Members" value={String(group.members.length)} />
						<StatCard label="Paid" value={String(pagedContributions.filter((c) => c.status === "PAID").length)} />
						<StatCard label="Missed" value={String(pagedContributions.filter((c) => c.status === "MISSED").length)} />
					</div>

					<Card>
						<CardHeader className="space-y-3">
							<SectionHeader
								title="Members"
								subtitle="Current participants and payout turns"
								actions={isAdmin ? <AddMemberForm groupId={groupId} onDone={load} /> : undefined}
							/>
						</CardHeader>
						<CardBody className="divide-y divide-line">
							{group.members.map((m) => (
								<div key={m.id} className="flex items-center justify-between py-2 text-sm">
									<span>{m.user.name}</span>
									<span className="text-ink/40">Turn #{m.payoutOrder}</span>
								</div>
							))}
							{group.members.length === 0 && <p className="py-2 text-sm text-ink/40">No members yet.</p>}
						</CardBody>
					</Card>

					<Card>
						<CardHeader className="space-y-3">
							<SectionHeader
								title="Contributions"
								subtitle="Recent payments and status updates"
								actions={
									<div className="flex flex-wrap items-center gap-2 text-sm">
										<Button
											type="button"
											variant="secondary"
											size="sm"
											onClick={() => setSelectedCycle((cycle) => Math.max(1, cycle - 1))}
											disabled={selectedCycle <= 1}
										>
											Prev cycle
										</Button>
										<span className="text-ink/60">Cycle {selectedCycle} of {maxCycle}</span>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											onClick={() => setSelectedCycle((cycle) => Math.min(maxCycle, cycle + 1))}
											disabled={selectedCycle >= maxCycle}
										>
											Next cycle
										</Button>
									</div>
								}
							/>
							{isAdmin && group.members.length > 0 && (
								<div className="mt-3">
									<RecordContributionForm
										groupId={groupId}
										members={group.members}
										expectedAmount={group.contributionAmount}
										disabledMemberIds={disabledMemberIds}
										onDone={load}
									/>
								</div>
							)}
						</CardHeader>
						<CardBody className="max-h-[24rem] divide-y divide-line overflow-y-auto pr-1">
							{pagedContributions.map((c) => (
								<div key={c.id} className="flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p className="font-medium">{c.member.name}</p>
										<p className="text-xs text-ink/40">
											Cycle #{c.cycleNumber} · {new Date(c.createdAt).toLocaleDateString()}
										</p>
									</div>
									<div className="flex items-center gap-3">
										<span className="ledger-figure">{naira(c.amount)}</span>
										<Badge tone={c.status.toLowerCase() as any}>{c.status.toLowerCase()}</Badge>
									</div>
								</div>
							))}
							{pagedContributions.length === 0 && <p className="py-2 text-sm text-ink/40">No contributions recorded for this cycle yet.</p>}
						</CardBody>
					</Card>
				</div>
			</div>
		</div>
	);
}

export default function GroupAdminGroupDetailPage() {
	const params = useParams<{ id: string }>();
	return <DashboardShell>{(session) => <GroupDetailContent session={session} groupId={params.id} />}</DashboardShell>;
}
