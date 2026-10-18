"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useNotifier } from "@/components/ui/ToastNotification";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/types";
import { CheckCircle2, ChevronDown, CircleX, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  kind?: "STANDARD" | "PACKAGE";
}

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PolicyTemplate {
  id: string;
  name: string;
  content: string;
}

interface CreatedPackageResponse {
  productId: string;
}

type RepaymentFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
type DownPaymentType = "PERCENTAGE" | "FIXED";

const STEP_TITLES = [
  "Customer",
  "Product",
  "Payment Plan",
  "Agreement & Review",
] as const;

function naira(n: number | string) {
  return `N${Number(n).toLocaleString("en-NG")}`;
}

function estimateCompletionDate(
  startDate: Date,
  installments: number,
  frequency: RepaymentFrequency,
) {
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [packageName, setPackageName] = useState("");

  const [totalAmount, setTotalAmount] = useState("");
  const [downPaymentType, setDownPaymentType] =
    useState<DownPaymentType>("PERCENTAGE");
  const [downPaymentValue, setDownPaymentValue] = useState("");
  const [frequency, setFrequency] = useState<RepaymentFrequency>("MONTHLY");
  const [numberOfInstallments, setNumberOfInstallments] = useState("6");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [templateSelectValue, setTemplateSelectValue] = useState("NONE");
  const [appliedTemplate, setAppliedTemplate] = useState<PolicyTemplate | null>(
    null,
  );
  const [previewTemplate, setPreviewTemplate] = useState<PolicyTemplate | null>(
    null,
  );

  const router = useRouter();
  const { presentError, success } = useNotifier();

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      apiFetch<CustomerOption[]>("/api/users?role=CUSTOMER"),
      apiFetch<Product[]>("/api/products"),
      apiFetch<PolicyTemplate[]>("/api/policy-templates"),
    ])
      .then(([customersResult, productsResult, templatesResult]) => {
        if (customersResult.status === "fulfilled") {
          const customersData = customersResult.value;
          setCustomers(customersData);
          if (customersData.length > 0) {
            setCustomerId((current) => current || customersData[0].id);
          }
        } else {
          setCustomers([]);
          presentError(customersResult.reason, "Could not load customers");
        }

        if (productsResult.status === "fulfilled") {
          setProducts(productsResult.value);
        } else {
          setProducts([]);
          presentError(productsResult.reason, "Could not load products");
        }

        if (templatesResult.status === "fulfilled") {
          setTemplates(templatesResult.value);
        } else {
          setTemplates([]);
          presentError(
            templatesResult.reason,
            "Could not load policy templates",
          );
        }
      })
      .finally(() => setLoading(false));
  }, [presentError]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customerId, customers],
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const selectedProductsBaseTotal = useMemo(
    () =>
      selectedProducts.reduce((sum, product) => sum + Number(product.price), 0),
    [selectedProducts],
  );

  useEffect(() => {
    if (!totalAmount && selectedProductsBaseTotal > 0) {
      setTotalAmount(String(selectedProductsBaseTotal));
    }
  }, [selectedProductsBaseTotal, totalAmount]);

  const parsedTotalAmount = Number(totalAmount || 0);
  const parsedDownPayment = Number(downPaymentValue || 0);
  const installmentCount = Math.max(1, Number(numberOfInstallments) || 1);

  const computedDownPayment =
    downPaymentType === "PERCENTAGE"
      ? (parsedTotalAmount * parsedDownPayment) / 100
      : parsedDownPayment;

  const sanitizedDownPayment = Math.max(
    0,
    Math.min(parsedTotalAmount, computedDownPayment),
  );
  const financedAmount = Math.max(0, parsedTotalAmount - sanitizedDownPayment);
  const estimatedInstallmentAmount = financedAmount / installmentCount;

  const startDateValue = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const completionDate =
    startDateValue && !Number.isNaN(startDateValue.getTime())
      ? estimateCompletionDate(startDateValue, installmentCount, frequency)
      : null;

  const completionDateLabel = completionDate
    ? completionDate.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function removeSelectedProduct(productId: string) {
    setSelectedProductIds((current) =>
      current.filter((id) => id !== productId),
    );
  }

  function nextStep() {
    if (step === 1 && !selectedCustomer) return;
    if (step === 2) {
      if (selectedProductIds.length === 0) return;
      if (selectedProductIds.length > 1 && packageName.trim().length < 2)
        return;
    }
    if (step === 3) {
      if (!Number.isFinite(parsedTotalAmount) || parsedTotalAmount <= 0) return;
      if (
        downPaymentType === "PERCENTAGE" &&
        (parsedDownPayment < 0 || parsedDownPayment > 100)
      )
        return;
      if (downPaymentType === "FIXED" && parsedDownPayment < 0) return;
    }

    setStep((current) => Math.min(4, current + 1));
  }

  function previousStep() {
    setStep((current) => Math.max(1, current - 1));
  }

  async function createInstallment() {
    if (!selectedCustomer || selectedProductIds.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      let productId = selectedProductIds[0];

      if (selectedProductIds.length > 1) {
        const pkg = await apiFetch<CreatedPackageResponse>("/api/packages", {
          method: "POST",
          body: JSON.stringify({
            name: packageName.trim(),
            productIds: selectedProductIds,
            pricingMode: "NO_DISCOUNT",
          }),
        });
        productId = pkg.productId;
      }

      await apiFetch("/api/installments", {
        method: "POST",
        body: JSON.stringify({
          productId,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerEmail: selectedCustomer.email,
          totalAmount: parsedTotalAmount,
          downPaymentType,
          downPaymentValue: parsedDownPayment,
          numberOfInstallments: installmentCount,
          repaymentFrequency: frequency,
          startDate: new Date(startDate).toISOString(),
          policyTemplateId: appliedTemplate?.id,
        }),
      });

      success("Installment plan created.");
      router.push("/dashboards/vendor-hub/installments");
    } catch (error) {
      presentError(error, "Could not create installment plan");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Card>
          <CardBody className="p-6">
            <SkeletonText lines={8} />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Installment Plan"
        subtitle="Set up a structured repayment plan for a customer purchase"
      />

      <Card className="mx-auto w-full max-w-3xl">
        <CardBody className="p-0">
          <div className="border-b border-line px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              {STEP_TITLES.map((label, index) => {
                const current = index + 1;
                const done = current < step;
                const active = current === step;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                        done || active
                          ? "border-forest-400 text-forest-600"
                          : "border-line text-ink/45"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        current
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        done || active
                          ? "font-medium text-forest-600"
                          : "text-ink/55"
                      }`}
                    >
                      {label}
                    </span>
                    {current < STEP_TITLES.length && (
                      <span
                        className="mx-1 h-px w-10 bg-line"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            {step === 1 && (
              <>
                <label
                  className="block text-sm font-medium text-ink"
                  htmlFor="installment-customer"
                >
                  Select Customer
                </label>
                <div className="relative">
                  <select
                    id="installment-customer"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    className="h-11 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                  >
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="rounded-md bg-gold-50 px-4 py-2 text-center text-sm text-ink/70">
                  You can add multiple items to form a package.
                </div>

                <label className="block text-sm font-medium text-ink">
                  Select Product
                </label>
                <div className="space-y-2 rounded-md border border-line p-2">
                  {products.map((product) => {
                    const selected = selectedProductIds.includes(product.id);
                    return (
                      <label
                        key={product.id}
                        className={`flex cursor-pointer items-center justify-between rounded px-2 py-2 text-sm ${
                          selected ? "bg-[#ECF3FF]" : "hover:bg-canvas/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleProductSelection(product.id)}
                            className="h-4 w-4 rounded border-line text-violet-500 focus:ring-violet-300"
                          />
                          <span>{product.name}</span>
                        </div>
                        <span className="text-ink/60">
                          {naira(product.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedProducts.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {selectedProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-gold-200 bg-gold-50 px-2 py-1 text-xs text-ink/75"
                          onClick={() => removeSelectedProduct(product.id)}
                        >
                          {product.name}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>

                    {selectedProducts.length > 1 && (
                      <>
                        <span className="inline-flex rounded bg-forest-100 px-2 py-1 text-xs font-medium text-forest-700">
                          Create as a Package
                        </span>
                        <div>
                          <label
                            className="mb-1.5 block text-sm font-medium text-ink"
                            htmlFor="package-name"
                          >
                            Package Name
                          </label>
                          <Input
                            id="package-name"
                            value={packageName}
                            onChange={(event) =>
                              setPackageName(event.target.value)
                            }
                            placeholder="Sabi Package"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {step === 3 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-ink"
                    htmlFor="total-amount"
                  >
                    Total Amount (Naira)
                  </label>
                  <Input
                    id="total-amount"
                    type="number"
                    min="1"
                    value={totalAmount}
                    onChange={(event) => setTotalAmount(event.target.value)}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-ink"
                    htmlFor="down-type"
                  >
                    Down payment type
                  </label>
                  <select
                    id="down-type"
                    value={downPaymentType}
                    onChange={(event) =>
                      setDownPaymentType(event.target.value as DownPaymentType)
                    }
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed</option>
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-ink"
                    htmlFor="down-value"
                  >
                    {downPaymentType === "PERCENTAGE"
                      ? "Down payment percentage"
                      : "Down payment value"}
                  </label>
                  <Input
                    id="down-value"
                    type="number"
                    min="0"
                    max={downPaymentType === "PERCENTAGE" ? "100" : undefined}
                    value={downPaymentValue}
                    onChange={(event) =>
                      setDownPaymentValue(event.target.value)
                    }
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-ink"
                    htmlFor="frequency"
                  >
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(event) =>
                      setFrequency(event.target.value as RepaymentFrequency)
                    }
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-ink"
                    htmlFor="installment-count"
                  >
                    Number of installments
                  </label>
                  <Input
                    id="installment-count"
                    type="number"
                    min="1"
                    max="60"
                    value={numberOfInstallments}
                    onChange={(event) =>
                      setNumberOfInstallments(event.target.value)
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    className="mb-1.5 block text-sm font-medium text-ink"
                    htmlFor="start-date"
                  >
                    Payment Start Date
                  </label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>

                <div className="md:col-span-2 rounded-md border border-line bg-canvas/30 p-4 text-sm">
                  <p className="font-medium text-ink">Repayment preview</p>
                  <div className="mt-2 space-y-1 text-ink/65">
                    <p>Product Price: {naira(parsedTotalAmount)}</p>
                    <p>Down payment now: {naira(sanitizedDownPayment)}</p>
                    <p>Amount to finance: {naira(financedAmount)}</p>
                    <p>
                      Estimated {frequency.toLowerCase()} payment:{" "}
                      {naira(estimatedInstallmentAmount)} x {installmentCount}
                    </p>
                    <p>
                      Estimated payment completion date: {completionDateLabel}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-ink"
                    htmlFor="policy-template"
                  >
                    Select Template
                  </label>
                  <div className="relative">
                    <select
                      id="policy-template"
                      value={templateSelectValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTemplateSelectValue(value);
                        if (value === "NONE") {
                          setAppliedTemplate(null);
                          return;
                        }
                        const selected = templates.find(
                          (template) => template.id === value,
                        );
                        if (selected) setPreviewTemplate(selected);
                      }}
                      className="h-11 w-full appearance-none rounded-md border border-line bg-white px-3 pr-9 text-sm text-ink focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-300"
                    >
                      <option value="NONE">None</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border border-line">
                  <div className="grid grid-cols-2 gap-2 border-b border-line bg-canvas/40 px-4 py-2 text-sm font-medium text-ink/80">
                    <p>Customer</p>
                    <p className="text-right">
                      {selectedCustomer?.name ?? "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2 text-sm text-ink/75">
                    <p>Product</p>
                    <p className="text-right">
                      {selectedProducts.map((p) => p.name).join(", ") || "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2 text-sm text-ink/75">
                    <p>Package</p>
                    <p className="text-right">
                      {selectedProductIds.length > 1
                        ? packageName || "Pending name"
                        : "None"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2 text-sm text-ink/75">
                    <p>Total</p>
                    <p className="text-right">{naira(parsedTotalAmount)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2 text-sm text-ink/75">
                    <p>Deposit</p>
                    <p className="text-right">{naira(sanitizedDownPayment)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-2 text-sm text-ink/75">
                    <p>Installment</p>
                    <p className="text-right">
                      {naira(estimatedInstallmentAmount)} x {installmentCount}{" "}
                      {frequency.toLowerCase()}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-4 py-2 text-sm text-ink/75">
                    <p>Template</p>
                    <p className="text-right">
                      {appliedTemplate?.name ?? "None"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-4 sm:px-6">
            <Link href="/dashboards/vendor-hub/installments">
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </Link>
            {step > 1 && (
              <Button variant="secondary" size="sm" onClick={previousStep}>
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button size="sm" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={createInstallment}
                disabled={submitting || !selectedCustomer || !appliedTemplate}
              >
                {submitting ? "Creating..." : "Create"}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {previewTemplate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-ink">
                  {previewTemplate.name}
                </p>
                <p className="mt-1 text-sm text-ink/50">
                  Review before applying to this installment
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-line p-1 text-ink/50 hover:bg-canvas/50"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close policy preview"
              >
                <CircleX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[340px] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-canvas/20 p-4 text-sm text-ink/75">
              {previewTemplate.content}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setAppliedTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  success("Policy template applied.");
                }}
              >
                Apply Policy Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FallbackContent() {
  return (
    <Card className="p-6">
      <p className="text-sm text-ink/50">
        This page is available to vendor accounts.
      </p>
    </Card>
  );
}

export default function VendorHubCreateInstallmentPage() {
  return (
    <DashboardShell>
      {(session: SessionUser) =>
        session.role === "VENDOR" ? (
          <CreateInstallmentContent />
        ) : (
          <FallbackContent />
        )
      }
    </DashboardShell>
  );
}
