"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { groupDetailPathByRole } from "@/lib/role-routes";
import type { SessionUser } from "@/types";
import { Plus, Users } from "lucide-react";

interface GroupSummary {
	id: string;
	name: string;
	contributionAmount: string;
	contributionGoal?: string | number;
	frequency: string;
	totalMembers: number;
}

function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState({
		name: "",
		contributionAmount: "",
		frequency: "MONTHLY",
		startDate: "",
		totalMembers: ""
	});
	const [loading, setLoading] = useState(false);
	const { success, presentError } = useNotifier();
	const contributionGoal =
		(Number(form.contributionAmount) || 0) * (Number(form.totalMembers) || 0);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await apiFetch("/api/groups", {
				method: "POST",
				body: JSON.stringify({
					name: form.name,
					contributionAmount: Number(form.contributionAmount),
					frequency: form.frequency,
					startDate: form.startDate,
					totalMembers: Number(form.totalMembers)
				})
			});
			setForm({ name: "", contributionAmount: "", frequency: "MONTHLY", startDate: "", totalMembers: "" });
			setOpen(false);
			success("Group created successfully.");
			onCreated();
		} catch (err) {
			presentError(err, "Could not create group");
		} finally {
			setLoading(false);
		}
	}

	if (!open) {
		return (
			<Button onClick={() => setOpen(true)}>
				<Plus className="h-4 w-4" /> New group
			</Button>
		);
	}

	return (
		<Card className="mb-6 p-5">
			<form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="name">Group name</Label>
					<Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
				</div>
				<div>
					<Label htmlFor="amount">Contribution amount (₦)</Label>
					<Input
						id="amount"
						type="number"
						min="1"
						required
						value={form.contributionAmount}
						onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
					/>
				</div>
				<div>
					<Label htmlFor="frequency">Frequency</Label>
					<select
						id="frequency"
						className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
						value={form.frequency}
						onChange={(e) => setForm({ ...form, frequency: e.target.value })}
					>
						<option value="DAILY">Daily</option>
						<option value="WEEKLY">Weekly</option>
						<option value="MONTHLY">Monthly</option>
					</select>
				</div>
				<div>
					<Label htmlFor="startDate">Start date</Label>
					<Input
						id="startDate"
						type="date"
						required
						value={form.startDate}
						onChange={(e) => setForm({ ...form, startDate: e.target.value })}
					/>
				</div>
				<div>
					<Label htmlFor="totalMembers">Total members</Label>
					<Input
						id="totalMembers"
						type="number"
						min="2"
						required
						value={form.totalMembers}
						onChange={(e) => setForm({ ...form, totalMembers: e.target.value })}
					/>
				</div>
				<div>
					<Label htmlFor="contributionGoal">Contribution goal amount (₦)</Label>
					<Input
						id="contributionGoal"
						readOnly
						value={`₦${contributionGoal.toLocaleString("en-NG")}`}
						className="ledger-figure bg-canvas/60"
					/>
				</div>
				<div className="md:col-span-2 flex gap-2">
					<Button type="submit" disabled={loading}>
						{loading ? "Creating…" : "Create group"}
					</Button>
					<Button type="button" variant="ghost" onClick={() => setOpen(false)}>
						Cancel
					</Button>
				</div>
			</form>
		</Card>
	);
}

function GroupsList({ session }: { session: SessionUser }) {
	const [groups, setGroups] = useState<GroupSummary[] | null>(null);
	const { presentError } = useNotifier();
	const isAdmin = session.role === "ADMIN";

	const load = useCallback(() => {
		apiFetch<GroupSummary[]>("/api/groups")
			.then(setGroups)
			.catch((err) => {
				setGroups([]);
				presentError(err, "Could not load groups");
			});
	}, [presentError]);

	useEffect(load, []);

	return (
		<div className="space-y-6">
			<PageHeader
				title={isAdmin ? "Your groups" : "My groups"}
				subtitle={
					isAdmin
						? "Create and manage your savings circles with clear rotation and contribution tracking."
						: "Track contribution status, payout order, and updates for all your joined groups."
				}
				actions={isAdmin ? <CreateGroupForm onCreated={load} /> : undefined}
			/>

			{!groups && (
				<div className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 4 }).map((_, index) => (
						<Card key={index} className="p-5">
							<Skeleton className="h-6 w-2/3" />
							<Skeleton className="mt-2 h-4 w-1/2" />
							<Skeleton className="mt-4 h-7 w-28" />
						</Card>
					))}
				</div>
			)}
			{groups && groups.length === 0 && (
				<Card className="p-8 text-center">
					<Users className="mx-auto h-8 w-8 text-forest-300" />
					<p className="mt-3 text-sm text-ink/50">
						{session.role === "ADMIN"
							? "No groups yet. Create your first Ajo group to get started."
							: "You haven't been added to a group yet."}
					</p>
				</Card>
			)}

			<Card className="p-5">
				<SectionHeader
					title={isAdmin ? "Group directory" : "Joined groups"}
					subtitle={isAdmin ? "Open a group to manage members and cycle activity." : "Open a group to view your contributions and payout position."}
				/>
				<CardBody className="grid gap-4 px-0 pb-0 pt-4 md:grid-cols-2">
					{groups?.map((g) => {
						const goal = g.contributionGoal ?? Number(g.contributionAmount) * Number(g.totalMembers || 0);

						return (
							<Link key={g.id} href={groupDetailPathByRole(session.role, g.id)}>
								<Card className="p-5 transition-colors hover:border-forest-300 hover:bg-forest-50/35">
									<p className="font-display font-semibold text-lg">{g.name}</p>
									<p className="mt-1 text-sm text-ink/50 capitalize">
										{g.frequency.toLowerCase()} · {g.totalMembers} members
									</p>
									<p className="mt-2 text-xs text-ink/55">Contribution goal: ₦{Number(goal).toLocaleString("en-NG")}</p>
									<p className="ledger-figure mt-3 text-forest-600 font-semibold">
										₦{Number(g.contributionAmount).toLocaleString("en-NG")} {g.frequency.toLowerCase()}
									</p>
								</Card>
							</Link>
						);
					})}
				</CardBody>
			</Card>
		</div>
	);
}

export default function GroupMemberGroupsPage() {
	return <DashboardShell>{(session) => <GroupsList session={session} />}</DashboardShell>;
}
