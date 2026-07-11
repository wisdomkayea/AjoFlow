"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader, SectionHeader } from "@/components/dashboard/PageHeader";
import { apiFetch, ClientApiError } from "@/lib/api-client";

interface Product {
	id: string;
	name: string;
	price: string;
}

type RepaymentFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

function naira(n: number | string) {
	return `₦${Number(n).toLocaleString("en-NG")}`;
}

function estimateCompletionDate(startDate: Date, installments: number, frequency: RepaymentFrequency) {
	const date = new Date(startDate);
	const steps = Math.max(0, installments - 1);

	if (frequency === "DAILY") {
		date.setDate(date.getDate() + steps);
		return date;
	}

	if (frequency === "WEEKLY") {
		date.setDate(date.getDate() + steps * 7);
		return date;
	}

	date.setMonth(date.getMonth() + steps);
	return date;
}

function CreateInstallmentContent() {
	const [products, setProducts] = useState<Product[]>([]);
	const [loadingProducts, setLoadingProducts] = useState(true);

	const [productId, setProductId] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [downPaymentType, setDownPaymentType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
	const [downPaymentPercent, setDownPaymentPercent] = useState("");
	const [downPaymentFixedAmount, setDownPaymentFixedAmount] = useState("");
	const [numberOfInstallments, setNumberOfInstallments] = useState("6");
	const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>("MONTHLY");
	const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [submitting, setSubmitting] = useState(false);

	const router = useRouter();
	const { success, presentError } = useNotifier();

	useEffect(() => {
		apiFetch<Product[]>("/api/products")
			.then((data) => {
				setProducts(data);
				if (data.length > 0) setProductId((prev) => prev || data[0].id);
			})
			.catch((err) => presentError(err, "Could not load products"))
			.finally(() => setLoadingProducts(false));
	}, [presentError]);

	const selectedProduct = products.find((p) => p.id === productId);
	const productPrice = Number(selectedProduct?.price ?? 0);
	const downPaymentRaw =
		downPaymentType === "PERCENTAGE"
			? Number(downPaymentPercent || 0)
			: Number(downPaymentFixedAmount || 0);
	const downPaymentAmount =
		downPaymentType === "PERCENTAGE"
			? (productPrice * downPaymentRaw) / 100
			: downPaymentRaw;
	const sanitizedDownPayment = Math.max(0, Math.min(productPrice, downPaymentAmount));
	const financedAmount = Math.max(0, productPrice - sanitizedDownPayment);
	const installmentCount = Math.max(1, Number(numberOfInstallments) || 1);
	const estimatedInstallmentAmount = financedAmount / installmentCount;
	const startDateValue = startDate ? new Date(`${startDate}T00:00:00`) : null;
	const validStartDate = startDateValue && !Number.isNaN(startDateValue.getTime()) ? startDateValue : null;
	const completionDate =
		financedAmount <= 0
			? validStartDate
			: validStartDate
				? estimateCompletionDate(validStartDate, installmentCount, repaymentFrequency)
				: null;
	const completionDateLabel = completionDate
		? completionDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
		: "-";

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		try {
			if (!selectedProduct) throw new ClientApiError("Please select a product", 422);
			await apiFetch("/api/installments", {
				method: "POST",
				body: JSON.stringify({
					productId,
					customerName: customerName.trim(),
					customerEmail: customerEmail.trim().toLowerCase(),
					totalAmount: productPrice,
					downPaymentType,
					downPaymentValue: downPaymentRaw,
					numberOfInstallments: installmentCount,
					repaymentFrequency,
					startDate: new Date(startDate).toISOString()
				})
			});

			success("Installment plan assigned.");
			router.push("/dashboards/vendor-hub/installments");
		} catch (err) {
			presentError(err, "Could not create installment plan");
		} finally {
			setSubmitting(false);
		}
	}

	if (loadingProducts) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-56" />
				<Card>
					<CardHeader>
						<Skeleton className="h-6 w-44" />
					</CardHeader>
					<CardBody>
						<SkeletonText lines={6} />
					</CardBody>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader
				title="Create installment plan"
				subtitle="Set up a structured repayment plan for a customer purchase."
				actions={
					<Link href="/dashboards/vendor-hub/installments">
						<Button variant="secondary" size="sm">Back to installments</Button>
					</Link>
				}
			/>

			<Card>
				<CardHeader>
					<SectionHeader
						title="Create installment plan"
						subtitle="Configure down payment, schedule, and repayment terms"
					/>
				</CardHeader>
				<CardBody>
					<form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
						<div>
							<Label htmlFor="product">Product</Label>
							<select
								id="product"
								className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
								value={productId}
								onChange={(e) => setProductId(e.target.value)}
							>
								{products.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name} ({naira(p.price)})
									</option>
								))}
							</select>
							<p className="mt-1 text-xs text-ink/45">Item price: {naira(productPrice)}</p>
						</div>

						<div>
							<Label htmlFor="customerName">Customer name</Label>
							<Input
								id="customerName"
								required
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="customer">Customer email</Label>
							<Input
								id="customer"
								type="email"
								required
								value={customerEmail}
								onChange={(e) => setCustomerEmail(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="downType">Down payment type</Label>
							<select
								id="downType"
								className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
								value={downPaymentType}
								onChange={(e) => setDownPaymentType(e.target.value as "PERCENTAGE" | "FIXED")}
							>
								<option value="PERCENTAGE">Percentage (%)</option>
								<option value="FIXED">Fixed amount (₦)</option>
							</select>
						</div>
						{downPaymentType === "PERCENTAGE" ? (
							<>
								<div>
									<Label htmlFor="downPercent">Down payment percentage (%)</Label>
									<Input
										id="downPercent"
										type="number"
										min="0"
										max="100"
										value={downPaymentPercent}
										onChange={(e) => setDownPaymentPercent(e.target.value)}
									/>
								</div>
								<div>
									<Label htmlFor="downAmount">Down payment value (₦)</Label>
									<Input
										id="downAmount"
										readOnly
										value={naira(sanitizedDownPayment)}
										className="ledger-figure bg-canvas/60"
									/>
								</div>
							</>
						) : (
							<div>
								<Label htmlFor="downValue">Down payment value (₦)</Label>
								<Input
									id="downValue"
									type="number"
									min="0"
									value={downPaymentFixedAmount}
									onChange={(e) => setDownPaymentFixedAmount(e.target.value)}
								/>
							</div>
						)}

						<div>
							<Label htmlFor="frequency">Repayment frequency</Label>
							<select
								id="frequency"
								className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
								value={repaymentFrequency}
								onChange={(e) => setRepaymentFrequency(e.target.value as RepaymentFrequency)}
							>
								<option value="DAILY">Daily</option>
								<option value="WEEKLY">Weekly</option>
								<option value="MONTHLY">Monthly</option>
							</select>
						</div>
						<div>
							<Label htmlFor="installmentCount">Number of installments</Label>
							<Input
								id="installmentCount"
								type="number"
								min="1"
								max="60"
								required
								value={numberOfInstallments}
								onChange={(e) => setNumberOfInstallments(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="startDate">Repayment start date</Label>
							<Input
								id="startDate"
								type="date"
								required
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>

						<div className="md:col-span-3 rounded-md border border-line bg-canvas/30 p-3 text-sm">
							<p className="font-medium text-ink/80">Repayment preview</p>
							<p className="mt-1 text-ink/60">Product price: {naira(productPrice)}</p>
							<p className="text-ink/60">Down payment now: {naira(sanitizedDownPayment)}</p>
							<p className="text-ink/60">Amount to finance: {naira(financedAmount)}</p>
							<p className="text-ink/60">
								Estimated {repaymentFrequency.toLowerCase()} payment: {naira(estimatedInstallmentAmount)} x {installmentCount}
							</p>
							<p className="text-ink/60">Estimated payment completion date: {completionDateLabel}</p>
							{financedAmount <= 0 && (
								<p className="text-ink/60">This plan can be completed immediately from down payment.</p>
							)}
						</div>

						<div className="md:col-span-3">
							<Button type="submit" size="sm" disabled={submitting}>
								{submitting ? "Creating…" : "Create plan"}
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
			<p className="text-sm text-ink/50">This page is available to vendor accounts.</p>
		</Card>
	);
}

export default function VendorHubCreateInstallmentPage() {
	return (
		<DashboardShell>
			{(session) => (session.role === "VENDOR" ? <CreateInstallmentContent /> : <FallbackContent />)}
		</DashboardShell>
	);
}

