"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/types";

interface Payment {
	id: string;
	amount: string;
	paidAt: string;
}

interface Installment {
	id: string;
	totalAmount: string;
	amountPaid: string;
	balance: string;
	status: "ACTIVE" | "COMPLETED" | "DEFAULTED";
	repaymentPreview?: {
		repaymentFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
		numberOfInstallments: number;
		suggestedInstallmentAmount: number;
		estimatedMonthlyPayment: number;
		startDate: string;
		estimatedCompletionDate: string;
	} | null;
	product: { name: string; vendor?: { name: string } };
	customer: { name: string; email: string };
	payments: Payment[];
}

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG")}`;
}

function RecordPaymentForm({ installmentId, onDone }: { installmentId: string; onDone: () => void }) {
	const [amount, setAmount] = useState("");
	const [loading, setLoading] = useState(false);
	const { success, presentError } = useNotifier();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		try {
			await apiFetch("/api/payments", {
				method: "POST",
				body: JSON.stringify({ installmentId, amount: Number(amount) })
			});
			setAmount("");
			success("Payment recorded.");
			onDone();
		} catch (err) {
			presentError(err, "Could not record payment");
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
			<div>
				<Label htmlFor="amount">Payment amount (₦)</Label>
				<Input id="amount" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} />
			</div>
			<Button type="submit" size="sm" disabled={loading} className="w-full sm:w-auto">
				{loading ? "Recording…" : "Record payment"}
			</Button>
		</form>
	);
}

function InstallmentDetail({ session, id }: { session: SessionUser; id: string }) {
	const [installment, setInstallment] = useState<Installment | null>(null);
	const { presentError } = useNotifier();

	const load = useCallback(() => {
		apiFetch<Installment[]>("/api/installments")
			.then((all) => {
				const found = all.find((i) => i.id === id);
				setInstallment((found as any) ?? null);
			})
			.catch((err) => presentError(err, "Could not load installment details"));
	}, [id, presentError]);
	useEffect(load, [load]);

	if (!installment) {
		return (
			<div className="space-y-6 max-w-2xl">
				<div className="flex items-center justify-between">
					<div>
						<Skeleton className="h-8 w-52" />
						<Skeleton className="mt-2 h-4 w-72" />
					</div>
					<Skeleton className="h-7 w-20" />
				</div>

				<Card className="p-5">
					<Skeleton className="h-8 w-40" />
					<Skeleton className="mt-4 h-2 w-full" />
					<Skeleton className="mt-4 h-4 w-44" />
				</Card>

				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-36" />
					</CardHeader>
					<CardBody>
						<SkeletonText lines={4} />
					</CardBody>
				</Card>
			</div>
		);
	}

	const progress = Math.min(100, (Number(installment.amountPaid) / Number(installment.totalAmount)) * 100);
	const repaymentPreview = installment.repaymentPreview;

	return (
		<div className="max-w-2xl space-y-6">
			<PageHeader
				title={installment.product.name}
				subtitle={`${installment.customer.name} · ${installment.customer.email}`}
				badge={<Badge tone={installment.status.toLowerCase() as any}>{installment.status.toLowerCase()}</Badge>}
				actions={
					<Link href="/dashboards/vendor-customer/installments">
						<Button variant="secondary" size="sm" className="w-full sm:w-auto">Back to installments</Button>
					</Link>
				}
			/>

			<Card className="p-5">
				<div className="flex items-baseline justify-between">
					<p className="ledger-figure text-2xl font-semibold text-forest-600">{naira(installment.amountPaid)}</p>
					<p className="text-sm text-ink/40">of {naira(installment.totalAmount)}</p>
				</div>
				<div className="mt-3 h-2 rounded-full bg-forest-50 overflow-hidden">
					<div className="h-full bg-forest-500 rounded-full" style={{ width: `${progress}%` }} />
				</div>
				<p className="mt-2 text-sm text-ink/50">{naira(installment.balance)} balance remaining</p>
			</Card>

			{repaymentPreview && (
				<Card className="p-5">
					<SectionHeader
						title="Repayment preview"
						subtitle="Projected schedule based on the original installment terms"
					/>
					<div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
						<div className="rounded-md border border-line bg-canvas/30 p-3">
							<p className="text-ink/50">Estimated monthly payment</p>
							<p className="ledger-figure mt-1 text-base font-semibold text-ink/80">
								{naira(repaymentPreview.estimatedMonthlyPayment)}
							</p>
						</div>
						<div className="rounded-md border border-line bg-canvas/30 p-3">
							<p className="text-ink/50">Estimated payment completion</p>
							<p className="mt-1 text-base font-semibold text-ink/80">
								{new Date(repaymentPreview.estimatedCompletionDate).toLocaleDateString("en-NG", {
									day: "numeric",
									month: "short",
									year: "numeric"
								})}
							</p>
						</div>
						<p className="text-ink/50 md:col-span-2">
							Schedule: {repaymentPreview.numberOfInstallments} {repaymentPreview.repaymentFrequency.toLowerCase()} payments,
							 started {new Date(repaymentPreview.startDate).toLocaleDateString("en-NG")}
						</p>
					</div>
				</Card>
			)}

			{session.role === "VENDOR" && installment.status !== "COMPLETED" && (
				<Card className="p-5">
					<SectionHeader title="Record a payment" subtitle="Post the customer's latest installment payment" />
					<div className="pt-3" />
					<RecordPaymentForm installmentId={installment.id} onDone={load} />
				</Card>
			)}

			<Card>
				<CardHeader>
					<SectionHeader title="Payment history" subtitle="Chronological log of all payments made" />
				</CardHeader>
				<CardBody className="divide-y divide-line">
					{installment.payments.map((p) => (
						<div key={p.id} className="flex items-center justify-between py-2 text-sm">
							<span className="text-ink/50">{new Date(p.paidAt).toLocaleDateString()}</span>
							<span className="ledger-figure font-medium">{naira(p.amount)}</span>
						</div>
					))}
					{installment.payments.length === 0 && <p className="py-2 text-sm text-ink/40">No payments recorded yet.</p>}
				</CardBody>
			</Card>
		</div>
	);
}

export default function VendorCustomerInstallmentDetailPage() {
	const params = useParams<{ id: string }>();
	return <DashboardShell>{(session) => <InstallmentDetail session={session} id={params.id} />}</DashboardShell>;
}
