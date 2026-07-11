import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { randomUUID } from "crypto";
import {
  CreateProductInput,
  CreateInstallmentInput,
  RecordPaymentInput
} from "@/lib/validation/vendor";
import { logAudit } from "./auditService";

type RepaymentFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

interface RepaymentPreview {
  repaymentFrequency: RepaymentFrequency;
  numberOfInstallments: number;
  suggestedInstallmentAmount: number;
  estimatedMonthlyPayment: number;
  startDate: string;
  estimatedCompletionDate: string;
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

function deriveEstimatedMonthlyPayment(amount: number, frequency: RepaymentFrequency) {
  if (frequency === "MONTHLY") return amount;
  if (frequency === "WEEKLY") return amount * 4.345;
  return amount * 30;
}

function buildRepaymentPreviewFromMetadata(metadata: unknown): RepaymentPreview | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const data = metadata as Record<string, unknown>;
  const repaymentFrequency = data.repaymentFrequency;
  const numberOfInstallments = Number(data.numberOfInstallments);
  const suggestedInstallmentAmount = Number(data.suggestedInstallmentAmount);
  const startDateRaw = data.startDate;

  if (
    (repaymentFrequency !== "DAILY" && repaymentFrequency !== "WEEKLY" && repaymentFrequency !== "MONTHLY") ||
    !Number.isFinite(numberOfInstallments) ||
    numberOfInstallments < 1 ||
    !Number.isFinite(suggestedInstallmentAmount) ||
    suggestedInstallmentAmount < 0 ||
    typeof startDateRaw !== "string"
  ) {
    return null;
  }

  const startDate = new Date(startDateRaw);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const estimatedCompletionDate = estimateCompletionDate(startDate, numberOfInstallments, repaymentFrequency);
  const estimatedMonthlyPayment = deriveEstimatedMonthlyPayment(suggestedInstallmentAmount, repaymentFrequency);

  return {
    repaymentFrequency,
    numberOfInstallments,
    suggestedInstallmentAmount: Number(suggestedInstallmentAmount.toFixed(2)),
    estimatedMonthlyPayment: Number(estimatedMonthlyPayment.toFixed(2)),
    startDate: startDate.toISOString(),
    estimatedCompletionDate: estimatedCompletionDate.toISOString()
  };
}

function buildFallbackRepaymentPreview(installment: {
  totalAmount: unknown;
  createdAt: Date;
}): RepaymentPreview {
  const repaymentFrequency: RepaymentFrequency = "MONTHLY";
  const numberOfInstallments = 6;
  const totalAmount = Math.max(0, Number(installment.totalAmount ?? 0));
  const suggestedInstallmentAmount = totalAmount / numberOfInstallments;
  const estimatedMonthlyPayment = deriveEstimatedMonthlyPayment(suggestedInstallmentAmount, repaymentFrequency);
  const estimatedCompletionDate = estimateCompletionDate(
    installment.createdAt,
    numberOfInstallments,
    repaymentFrequency
  );

  return {
    repaymentFrequency,
    numberOfInstallments,
    suggestedInstallmentAmount: Number(suggestedInstallmentAmount.toFixed(2)),
    estimatedMonthlyPayment: Number(estimatedMonthlyPayment.toFixed(2)),
    startDate: installment.createdAt.toISOString(),
    estimatedCompletionDate: estimatedCompletionDate.toISOString()
  };
}

async function withRepaymentPreview<T extends { id: string; totalAmount: unknown; createdAt: Date }>(installments: T[]) {
  if (installments.length === 0) {
    return installments.map((installment) => ({ ...installment, repaymentPreview: null }));
  }

  const ids = installments.map((installment) => installment.id);
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: "Installment",
      action: "INSTALLMENT_PLAN_CREATED",
      entityId: { in: ids }
    },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, metadata: true }
  });

  const previewByInstallment = new Map<string, RepaymentPreview>();
  for (const log of logs) {
    if (previewByInstallment.has(log.entityId)) {
      continue;
    }

    const preview = buildRepaymentPreviewFromMetadata(log.metadata);
    if (preview) {
      previewByInstallment.set(log.entityId, preview);
    }
  }

  return installments.map((installment) => ({
    ...installment,
    repaymentPreview: previewByInstallment.get(installment.id) ?? buildFallbackRepaymentPreview(installment)
  }));
}

export async function createProduct(vendorId: string, input: CreateProductInput) {
  let product;
  try {
    product = await prisma.product.create({
      data: {
        vendorId,
        name: input.name,
        price: input.price,
        imageUrl: input.imageDataUrl ?? null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingImageColumn = message.includes("imageUrl") && message.includes("does not exist");

    if (!missingImageColumn) {
      throw error;
    }

    // Fallback for environments where DB migration hasn't been applied yet.
    product = await prisma.product.create({
      data: {
        vendorId,
        name: input.name,
        price: input.price
      }
    });
  }

  await logAudit({
    actorId: vendorId,
    action: "PRODUCT_CREATED",
    entityType: "Product",
    entityId: product.id,
    metadata: {
      name: product.name,
      price: input.price,
      hasImage: Boolean(input.imageDataUrl)
    }
  });

  return product;
}

export async function createInstallmentPlan(vendorId: string, input: CreateInstallmentInput) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new ApiError("Product not found", 404);
  if (product.vendorId !== vendorId) {
    throw new ApiError("You can only assign your own products", 403);
  }

  let customerId = input.customerId;
  let customerCreated = false;

  if (!customerId) {
    const email = input.customerEmail?.trim().toLowerCase();
    if (!email) {
      throw new ApiError("Customer email is required when customerId is not provided", 422);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.role !== "CUSTOMER") {
        throw new ApiError("This email belongs to a non-customer account", 409);
      }
      customerId = existingUser.id;
    } else {
      const derivedName = input.customerName?.trim() || email.split("@")[0] || "New Customer";
      const passwordHash = await hashPassword(randomUUID());
      const customer = await prisma.user.create({
        data: {
          name: derivedName,
          email,
          passwordHash,
          role: "CUSTOMER"
        }
      });
      customerId = customer.id;
      customerCreated = true;
    }
  }

  if (!customerId) {
    throw new ApiError("Could not resolve customer for installment plan", 422);
  }

  const productPrice = Number(product.price);
  const principalAmount = Number(input.totalAmount ?? productPrice);
  const numberOfInstallments = input.numberOfInstallments ?? 6;
  const repaymentFrequency = input.repaymentFrequency ?? "MONTHLY";
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const downPaymentType = input.downPaymentType ?? "PERCENTAGE";
  const rawDownPaymentValue = Number(input.downPaymentValue ?? 0);

  if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
    throw new ApiError("Total amount must be greater than zero", 422);
  }

  const computedDownPayment =
    downPaymentType === "PERCENTAGE"
      ? (principalAmount * rawDownPaymentValue) / 100
      : rawDownPaymentValue;

  if (computedDownPayment < 0) {
    throw new ApiError("Down payment cannot be negative", 422);
  }

  if (computedDownPayment > principalAmount) {
    throw new ApiError("Down payment cannot exceed total amount", 422);
  }

  const financedAmount = Math.max(0, principalAmount - computedDownPayment);
  const suggestedInstallmentAmount =
    numberOfInstallments > 0 ? Number((financedAmount / numberOfInstallments).toFixed(2)) : financedAmount;
  const status = financedAmount === 0 ? "COMPLETED" : "ACTIVE";

  const [installment] = await prisma.$transaction(async (tx) => {
    const created = await tx.installment.create({
      data: {
        productId: input.productId,
        customerId,
        totalAmount: principalAmount,
        amountPaid: computedDownPayment,
        balance: financedAmount,
        status
      }
    });

    if (computedDownPayment > 0) {
      await tx.payment.create({
        data: {
          installmentId: created.id,
          amount: computedDownPayment
        }
      });
    }

    return [created] as const;
  });

  await logAudit({
    actorId: vendorId,
    action: "INSTALLMENT_PLAN_CREATED",
    entityType: "Installment",
    entityId: installment.id,
    metadata: {
      productId: input.productId,
      customerId,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerCreated,
      totalAmount: principalAmount,
      productPrice,
      downPaymentType,
      downPaymentValue: rawDownPaymentValue,
      downPaymentAmount: computedDownPayment,
      financedAmount,
      repaymentFrequency,
      numberOfInstallments,
      startDate: startDate.toISOString(),
      suggestedInstallmentAmount
    }
  });

  return installment;
}

export async function recordPayment(actorId: string, input: RecordPaymentInput) {
  const installment = await prisma.installment.findUnique({ where: { id: input.installmentId } });
  if (!installment) throw new ApiError("Installment plan not found", 404);
  if (installment.status === "COMPLETED") {
    throw new ApiError("This installment plan is already fully paid", 400);
  }

  const currentBalance = Number(installment.balance);
  if (input.amount > currentBalance) {
    throw new ApiError(
      `Payment of ${input.amount} exceeds the outstanding balance of ${currentBalance}`,
      422
    );
  }

  const newBalance = Math.max(0, currentBalance - input.amount);
  const newAmountPaid = Number(installment.amountPaid) + input.amount;
  const newStatus = newBalance === 0 ? "COMPLETED" : "ACTIVE";

  const [payment, updatedInstallment] = await prisma.$transaction([
    prisma.payment.create({
      data: { installmentId: installment.id, amount: input.amount }
    }),
    prisma.installment.update({
      where: { id: installment.id },
      data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus }
    })
  ]);

  await logAudit({
    actorId,
    action: "PAYMENT_RECORDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { installmentId: installment.id, amount: input.amount, newBalance }
  });

  return { payment, installment: updatedInstallment };
}

/** Marks an installment as defaulted (e.g. missed a scheduled deadline). */
export async function markInstallmentDefaulted(vendorId: string, installmentId: string) {
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: { product: true }
  });
  if (!installment) throw new ApiError("Installment plan not found", 404);
  if (installment.product.vendorId !== vendorId) {
    throw new ApiError("You can only update your own installment plans", 403);
  }
  if (installment.status === "COMPLETED") {
    throw new ApiError("Cannot default a completed installment plan", 400);
  }

  return prisma.installment.update({
    where: { id: installmentId },
    data: { status: "DEFAULTED" }
  });
}

export async function getCustomerInstallments(customerId: string) {
  const installments = await prisma.installment.findMany({
    where: { customerId },
    include: { product: true, customer: true, payments: { orderBy: { paidAt: "desc" } } },
    orderBy: { createdAt: "desc" }
  });

  return withRepaymentPreview(installments);
}

export async function getVendorDashboard(vendorId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    customers,
    paymentAgg,
    outstandingAgg,
    totalInstallments,
    billedAgg,
    paidAgg,
    statusCounts,
    paymentsLast30Agg,
    newPlansLast30Days,
    recentPayments
  ] = await Promise.all([
    prisma.installment.findMany({ where: { product: { vendorId } }, distinct: ["customerId"] }),
    prisma.payment.aggregate({
      where: { installment: { product: { vendorId } } },
      _sum: { amount: true }
    }),
    prisma.installment.aggregate({
      where: { product: { vendorId }, status: { not: "COMPLETED" } },
      _sum: { balance: true }
    }),
    prisma.installment.count({ where: { product: { vendorId } } }),
    prisma.installment.aggregate({
      where: { product: { vendorId } },
      _sum: { totalAmount: true }
    }),
    prisma.installment.aggregate({
      where: { product: { vendorId } },
      _sum: { amountPaid: true }
    }),
    prisma.installment.groupBy({
      by: ["status"],
      where: { product: { vendorId } },
      _count: { status: true }
    }),
    prisma.payment.aggregate({
      where: {
        installment: { product: { vendorId } },
        paidAt: { gte: thirtyDaysAgo }
      },
      _sum: { amount: true }
    }),
    prisma.installment.count({
      where: {
        product: { vendorId },
        createdAt: { gte: thirtyDaysAgo }
      }
    }),
    prisma.payment.findMany({
      where: { installment: { product: { vendorId } } },
      orderBy: { paidAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        paidAt: true,
        installment: {
          select: {
            customer: { select: { name: true } },
            product: { select: { name: true } }
          }
        }
      }
    })
  ]);

  const activeInstallments = statusCounts.find((row) => row.status === "ACTIVE")?._count.status ?? 0;
  const completedInstallments = statusCounts.find((row) => row.status === "COMPLETED")?._count.status ?? 0;
  const defaultedInstallments = statusCounts.find((row) => row.status === "DEFAULTED")?._count.status ?? 0;

  const totalBilled = Number(billedAgg._sum.totalAmount ?? 0);
  const totalPaid = Number(paidAgg._sum.amountPaid ?? 0);
  const collectionRatePct = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;
  const defaultRatePct = totalInstallments > 0 ? (defaultedInstallments / totalInstallments) * 100 : 0;
  const averageTicketSize = totalInstallments > 0 ? totalBilled / totalInstallments : 0;
  const paymentsLast30Days = Number(paymentsLast30Agg._sum.amount ?? 0);

  return {
    totalCustomers: customers.length,
    totalRevenue: Number(paymentAgg._sum.amount ?? 0),
    outstandingPayments: Number(outstandingAgg._sum.balance ?? 0),
    analytics: {
      totalInstallments,
      activeInstallments,
      completedInstallments,
      defaultedInstallments,
      totalBilled,
      totalPaid,
      averageTicketSize: Number(averageTicketSize.toFixed(2)),
      collectionRatePct: Number(collectionRatePct.toFixed(2)),
      defaultRatePct: Number(defaultRatePct.toFixed(2)),
      paymentsLast30Days,
      newPlansLast30Days,
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        paidAt: payment.paidAt.toISOString(),
        customerName: payment.installment.customer.name,
        productName: payment.installment.product.name
      }))
    }
  };
}

export async function listVendorInstallments(vendorId: string) {
  const installments = await prisma.installment.findMany({
    where: { product: { vendorId } },
    include: { product: true, customer: true, payments: { orderBy: { paidAt: "desc" } } },
    orderBy: { createdAt: "desc" }
  });

  return withRepaymentPreview(installments);
}
