import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { randomUUID } from "crypto";
import {
  CreateProductInput,
  CreateInstallmentInput,
  RecordPaymentInput,
  CreateWithdrawalInput,
  CreateVendorCustomerInput,
  CreateProductPackageInput,
  CreatePolicyTemplateInput,
  UpdatePolicyTemplateInput,
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

function deriveEstimatedMonthlyPayment(
  amount: number,
  frequency: RepaymentFrequency,
) {
  if (frequency === "MONTHLY") return amount;
  if (frequency === "WEEKLY") return amount * 4.345;
  return amount * 30;
}

function buildRepaymentPreviewFromMetadata(
  metadata: unknown,
): RepaymentPreview | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const data = metadata as Record<string, unknown>;
  const repaymentFrequency = data.repaymentFrequency;
  const numberOfInstallments = Number(data.numberOfInstallments);
  const suggestedInstallmentAmount = Number(data.suggestedInstallmentAmount);
  const startDateRaw = data.startDate;

  if (
    (repaymentFrequency !== "DAILY" &&
      repaymentFrequency !== "WEEKLY" &&
      repaymentFrequency !== "MONTHLY") ||
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

  const estimatedCompletionDate = estimateCompletionDate(
    startDate,
    numberOfInstallments,
    repaymentFrequency,
  );
  const estimatedMonthlyPayment = deriveEstimatedMonthlyPayment(
    suggestedInstallmentAmount,
    repaymentFrequency,
  );

  return {
    repaymentFrequency,
    numberOfInstallments,
    suggestedInstallmentAmount: Number(suggestedInstallmentAmount.toFixed(2)),
    estimatedMonthlyPayment: Number(estimatedMonthlyPayment.toFixed(2)),
    startDate: startDate.toISOString(),
    estimatedCompletionDate: estimatedCompletionDate.toISOString(),
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
  const estimatedMonthlyPayment = deriveEstimatedMonthlyPayment(
    suggestedInstallmentAmount,
    repaymentFrequency,
  );
  const estimatedCompletionDate = estimateCompletionDate(
    installment.createdAt,
    numberOfInstallments,
    repaymentFrequency,
  );

  return {
    repaymentFrequency,
    numberOfInstallments,
    suggestedInstallmentAmount: Number(suggestedInstallmentAmount.toFixed(2)),
    estimatedMonthlyPayment: Number(estimatedMonthlyPayment.toFixed(2)),
    startDate: installment.createdAt.toISOString(),
    estimatedCompletionDate: estimatedCompletionDate.toISOString(),
  };
}

async function withRepaymentPreview<
  T extends { id: string; totalAmount: unknown; createdAt: Date },
>(installments: T[]) {
  if (installments.length === 0) {
    return installments.map((installment) => ({
      ...installment,
      repaymentPreview: null,
    }));
  }

  const ids = installments.map((installment) => installment.id);

  let logs: Array<{ entityId: string; metadata: unknown }> = [];
  try {
    logs = await prisma.auditLog.findMany({
      where: {
        entityType: "Installment",
        action: "INSTALLMENT_PLAN_CREATED",
        entityId: { in: ids },
      },
      orderBy: { createdAt: "desc" },
      select: { entityId: true, metadata: true },
    });
  } catch (error) {
    console.error("[installments_preview_audit_lookup_failed]", error);
  }

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
    repaymentPreview:
      previewByInstallment.get(installment.id) ??
      buildFallbackRepaymentPreview(installment),
  }));
}

export async function createProduct(
  vendorId: string,
  input: CreateProductInput,
) {
  let product;
  try {
    product = await prisma.product.create({
      data: {
        vendorId,
        name: input.name,
        price: input.price,
        imageUrl: input.imageDataUrl ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingImageColumn =
      message.includes("imageUrl") && message.includes("does not exist");

    if (!missingImageColumn) {
      throw error;
    }

    // Fallback for environments where DB migration hasn't been applied yet.
    product = await prisma.product.create({
      data: {
        vendorId,
        name: input.name,
        price: input.price,
      },
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
      hasImage: Boolean(input.imageDataUrl),
    },
  });

  return product;
}

export async function createInstallmentPlan(
  vendorId: string,
  input: CreateInstallmentInput,
) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) throw new ApiError("Product not found", 404);
  if (product.vendorId !== vendorId) {
    throw new ApiError("You can only assign your own products", 403);
  }

  let customerId = input.customerId;
  let customerCreated = false;

  if (!customerId) {
    const email = input.customerEmail?.trim().toLowerCase();
    if (!email) {
      throw new ApiError(
        "Customer email is required when customerId is not provided",
        422,
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.role !== "CUSTOMER") {
        throw new ApiError("This email belongs to a non-customer account", 409);
      }
      customerId = existingUser.id;
    } else {
      const derivedName =
        input.customerName?.trim() || email.split("@")[0] || "New Customer";
      const passwordHash = await hashPassword(randomUUID());
      const customer = await prisma.user.create({
        data: {
          name: derivedName,
          email,
          passwordHash,
          role: "CUSTOMER",
        },
      });
      customerId = customer.id;
      customerCreated = true;
    }
  }

  if (!customerId) {
    throw new ApiError("Could not resolve customer for installment plan", 422);
  }

  let selectedPolicy: { id: string; name: string; content: string } | null =
    null;

  if (input.policyTemplateId) {
    const policyTemplate = await prisma.$queryRaw<
      Array<{ id: string; name: string; content: string }>
    >`
      SELECT "id", "name", "content"
      FROM "VendorPolicyTemplate"
      WHERE "id" = ${input.policyTemplateId}
        AND "vendorId" = ${vendorId}
      LIMIT 1
    `;

    if (policyTemplate.length === 0) {
      throw new ApiError("Selected policy template is invalid", 422);
    }

    selectedPolicy = policyTemplate[0];
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
    numberOfInstallments > 0
      ? Number((financedAmount / numberOfInstallments).toFixed(2))
      : financedAmount;
  const status = financedAmount === 0 ? "COMPLETED" : "ACTIVE";

  const [installment] = await prisma.$transaction(async (tx) => {
    const created = await tx.installment.create({
      data: {
        productId: input.productId,
        customerId,
        totalAmount: principalAmount,
        amountPaid: computedDownPayment,
        balance: financedAmount,
        status,
        policyTemplateId: selectedPolicy?.id,
        policyTemplateName: selectedPolicy?.name,
        policyTemplateContent: selectedPolicy?.content,
        policyAppliedAt: selectedPolicy ? new Date() : null,
      },
    });

    if (computedDownPayment > 0) {
      await tx.$executeRaw`
        INSERT INTO "Payment" ("id", "installmentId", "amount", "paidAt", "method", "reference")
        VALUES (
          ${randomUUID()},
          ${created.id},
          ${computedDownPayment},
          NOW(),
          CAST('SYSTEM' AS "PaymentMethod"),
          ${"Down Payment"}
        )
      `;
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
      suggestedInstallmentAmount,
      policyTemplateId: selectedPolicy?.id ?? null,
      policyTemplateName: selectedPolicy?.name ?? null,
    },
  });

  return installment;
}

export async function recordPayment(
  actorId: string,
  input: RecordPaymentInput,
) {
  const installment = await prisma.installment.findUnique({
    where: { id: input.installmentId },
  });
  if (!installment) throw new ApiError("Installment plan not found", 404);
  const currentBalance = Number(installment.balance);
  if (currentBalance <= 0) {
    throw new ApiError(
      "Only unpaid installment plans can receive manual payments",
      400,
    );
  }

  const policyState = await prisma.$queryRaw<
    Array<{
      policyTemplateContent: string | null;
      policyAcceptedAt: Date | null;
    }>
  >`
    SELECT "policyTemplateContent", "policyAcceptedAt"
    FROM "Installment"
    WHERE "id" = ${installment.id}
    LIMIT 1
  `;

  const activePolicy = policyState[0];

  if (
    activePolicy?.policyTemplateContent &&
    activePolicy.policyTemplateContent.trim().length > 0 &&
    !activePolicy.policyAcceptedAt
  ) {
    throw new ApiError(
      "Customer must agree to the applied policy template before payments can start",
      409,
    );
  }

  if (input.amount > currentBalance) {
    throw new ApiError(
      `Payment of ${input.amount} exceeds the outstanding balance of ${currentBalance}`,
      422,
    );
  }

  const newBalance = Math.max(0, currentBalance - input.amount);
  const newAmountPaid = Number(installment.amountPaid) + input.amount;
  const newStatus = newBalance === 0 ? "COMPLETED" : "ACTIVE";

  const paidAt = input.date ? new Date(`${input.date}T00:00:00`) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    throw new ApiError("Payment date is invalid", 422);
  }

  const paymentMethod = (input.method ?? "Cash").toUpperCase();
  const reference = input.reference?.trim() || installment.id;

  const [payment, updatedInstallment] = await prisma.$transaction(
    async (tx) => {
      const paymentRows = await tx.$queryRaw<
        Array<{
          id: string;
          amount: unknown;
          paidAt: Date;
          method: string;
          reference: string | null;
        }>
      >`
        INSERT INTO "Payment" ("id", "installmentId", "amount", "paidAt", "method", "reference")
        VALUES (
          ${randomUUID()},
          ${installment.id},
          ${input.amount},
          ${paidAt},
          CAST(${paymentMethod} AS "PaymentMethod"),
          ${reference}
        )
        RETURNING "id", "amount", "paidAt", "method", "reference"
      `;

      const updated = await tx.installment.update({
        where: { id: installment.id },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
        },
      });

      return [paymentRows[0], updated] as const;
    },
  );

  await logAudit({
    actorId,
    action: "PAYMENT_RECORDED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: {
      installmentId: installment.id,
      amount: input.amount,
      newBalance,
      method: paymentMethod,
      reference,
      paidAt: paidAt.toISOString(),
    },
  });

  return { payment, installment: updatedInstallment };
}

/** Marks an installment as defaulted (e.g. missed a scheduled deadline). */
export async function markInstallmentDefaulted(
  vendorId: string,
  installmentId: string,
) {
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: { product: true },
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
    data: { status: "DEFAULTED" },
  });
}

export async function getCustomerInstallments(customerId: string) {
  const installments = await prisma.installment.findMany({
    where: { customerId },
    include: {
      product: true,
      customer: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return withRepaymentPreview(installments);
}

export async function getVendorDashboard(vendorId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let withdrawnAgg: { _sum: { amount: unknown } } = { _sum: { amount: 0 } };
  try {
    withdrawnAgg = await prisma.walletWithdrawal.aggregate({
      where: { vendorId, status: "COMPLETED" },
      _sum: { amount: true },
    });
  } catch (error) {
    // Keep dashboard available even if wallet withdrawal objects are temporarily unavailable.
    console.error("[vendor_dashboard_withdrawals_aggregate_failed]", error);
  }

  const [
    customers,
    paymentAgg,
    outstandingAgg,
    activeInstallmentsByBalance,
    totalInstallments,
    billedAgg,
    paidAgg,
    statusCounts,
    paymentsLast30Agg,
    newPlansLast30Days,
    recentPayments,
  ] = await Promise.all([
    prisma.installment.findMany({
      where: { product: { vendorId } },
      distinct: ["customerId"],
    }),
    prisma.payment.aggregate({
      where: { installment: { product: { vendorId } } },
      _sum: { amount: true },
    }),
    prisma.installment.aggregate({
      where: { product: { vendorId }, balance: { gt: 0 } },
      _sum: { balance: true },
    }),
    prisma.installment.count({
      where: { product: { vendorId }, balance: { gt: 0 } },
    }),
    prisma.installment.count({ where: { product: { vendorId } } }),
    prisma.installment.aggregate({
      where: { product: { vendorId } },
      _sum: { totalAmount: true },
    }),
    prisma.installment.aggregate({
      where: { product: { vendorId } },
      _sum: { amountPaid: true },
    }),
    prisma.installment.groupBy({
      by: ["status"],
      where: { product: { vendorId } },
      _count: { status: true },
    }),
    prisma.payment.aggregate({
      where: {
        installment: { product: { vendorId } },
        paidAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    }),
    prisma.installment.count({
      where: {
        product: { vendorId },
        createdAt: { gte: thirtyDaysAgo },
      },
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
            product: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const activeInstallments = activeInstallmentsByBalance;
  const completedInstallments =
    statusCounts.find((row) => row.status === "COMPLETED")?._count.status ?? 0;
  const defaultedInstallments =
    statusCounts.find((row) => row.status === "DEFAULTED")?._count.status ?? 0;

  const totalBilled = Number(billedAgg._sum.totalAmount ?? 0);
  const totalPaid = Number(paidAgg._sum.amountPaid ?? 0);
  const collectionRatePct =
    totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;
  const defaultRatePct =
    totalInstallments > 0
      ? (defaultedInstallments / totalInstallments) * 100
      : 0;
  const averageTicketSize =
    totalInstallments > 0 ? totalBilled / totalInstallments : 0;
  const paymentsLast30Days = Number(paymentsLast30Agg._sum.amount ?? 0);
  const totalRevenue = Number(paymentAgg._sum.amount ?? 0);
  const totalWithdrawn = Number(withdrawnAgg._sum.amount ?? 0);

  return {
    totalCustomers: customers.length,
    totalRevenue,
    walletBalance: Math.max(0, totalRevenue - totalWithdrawn),
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
        productName: payment.installment.product.name,
      })),
    },
  };
}

/** Computes wallet balance (lifetime payments minus non-failed withdrawals) and recent withdrawal history. */
export async function getVendorWallet(vendorId: string) {
  const [paymentAgg, withdrawnAgg, recentWithdrawals] = await Promise.all([
    prisma.payment.aggregate({
      where: { installment: { product: { vendorId } } },
      _sum: { amount: true },
    }),
    prisma.walletWithdrawal.aggregate({
      where: { vendorId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.walletWithdrawal.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const totalRevenue = Number(paymentAgg._sum.amount ?? 0);
  const totalWithdrawn = Number(withdrawnAgg._sum.amount ?? 0);

  return {
    totalRevenue,
    walletBalance: Math.max(0, totalRevenue - totalWithdrawn),
    withdrawals: recentWithdrawals.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      bankName: w.bankName,
      accountNumber: w.accountNumber,
      accountName: w.accountName,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    })),
  };
}

/** Moves funds out of the vendor's Kreddt wallet to an external bank account; never affects totalRevenue. */
export async function createWalletWithdrawal(
  vendorId: string,
  input: CreateWithdrawalInput,
) {
  const wallet = await getVendorWallet(vendorId);
  if (input.amount > wallet.walletBalance) {
    throw new ApiError(
      "Withdrawal amount exceeds available wallet balance",
      400,
    );
  }

  const withdrawal = await prisma.walletWithdrawal.create({
    data: {
      vendorId,
      amount: input.amount,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
    },
  });

  await logAudit({
    actorId: vendorId,
    action: "WALLET_WITHDRAWAL_CREATED",
    entityType: "WalletWithdrawal",
    entityId: withdrawal.id,
    metadata: {
      amount: input.amount,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
    },
  });

  return {
    id: withdrawal.id,
    amount: Number(withdrawal.amount),
    bankName: withdrawal.bankName,
    accountNumber: withdrawal.accountNumber,
    accountName: withdrawal.accountName,
    status: withdrawal.status,
    createdAt: withdrawal.createdAt.toISOString(),
  };
}

export async function listVendorInstallments(vendorId: string) {
  const installments = await prisma.installment.findMany({
    where: { product: { vendorId } },
    include: {
      product: true,
      customer: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return withRepaymentPreview(installments);
}

export async function listVendorPolicyTemplates(vendorId: string) {
  const templates = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      usageCount: bigint;
    }>
  >`
    SELECT
      t."id",
      t."name",
      t."content",
      t."createdAt",
      t."updatedAt",
      COUNT(i."id")::bigint AS "usageCount"
    FROM "VendorPolicyTemplate" t
    LEFT JOIN "Installment" i ON i."policyTemplateId" = t."id"
    WHERE t."vendorId" = ${vendorId}
    GROUP BY t."id"
    ORDER BY t."updatedAt" DESC
  `;

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    content: template.content,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    usageCount: Number(template.usageCount ?? 0),
  }));
}

export async function createVendorPolicyTemplate(
  vendorId: string,
  input: CreatePolicyTemplateInput,
) {
  const name = input.name.trim();
  const content = input.content.trim();

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "VendorPolicyTemplate"
    WHERE "vendorId" = ${vendorId}
      AND LOWER("name") = LOWER(${name})
    LIMIT 1
  `;
  if (existing.length > 0) {
    throw new ApiError("A policy template with this name already exists", 409);
  }

  const created = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    INSERT INTO "VendorPolicyTemplate" ("id", "vendorId", "name", "content", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${vendorId}, ${name}, ${content}, NOW(), NOW())
    RETURNING "id", "name", "content", "createdAt", "updatedAt"
  `;

  const row = created[0];

  await logAudit({
    actorId: vendorId,
    action: "POLICY_TEMPLATE_CREATED",
    entityType: "Installment",
    entityId: row.id,
    metadata: {
      name: row.name,
    },
  });

  return {
    id: row.id,
    name: row.name,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateVendorPolicyTemplate(
  vendorId: string,
  templateId: string,
  input: UpdatePolicyTemplateInput,
) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "VendorPolicyTemplate"
    WHERE "id" = ${templateId}
      AND "vendorId" = ${vendorId}
    LIMIT 1
  `;
  if (existing.length === 0) {
    throw new ApiError("Policy template not found", 404);
  }

  const nextName = input.name?.trim();
  const nextContent = input.content?.trim();

  if (nextName) {
    const duplicate = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "VendorPolicyTemplate"
      WHERE "vendorId" = ${vendorId}
        AND "id" <> ${templateId}
        AND LOWER("name") = LOWER(${nextName})
      LIMIT 1
    `;

    if (duplicate.length > 0) {
      throw new ApiError(
        "A policy template with this name already exists",
        409,
      );
    }
  }

  const updated = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    UPDATE "VendorPolicyTemplate"
    SET
      "name" = COALESCE(${nextName ?? null}, "name"),
      "content" = COALESCE(${nextContent ?? null}, "content"),
      "updatedAt" = NOW()
    WHERE "id" = ${templateId}
      AND "vendorId" = ${vendorId}
    RETURNING "id", "name", "content", "createdAt", "updatedAt"
  `;

  const row = updated[0];

  return {
    id: row.id,
    name: row.name,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteVendorPolicyTemplate(
  vendorId: string,
  templateId: string,
) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "VendorPolicyTemplate"
    WHERE "id" = ${templateId}
      AND "vendorId" = ${vendorId}
    LIMIT 1
  `;

  if (existing.length === 0) {
    throw new ApiError("Policy template not found", 404);
  }

  await prisma.$executeRaw`
    DELETE FROM "VendorPolicyTemplate"
    WHERE "id" = ${templateId}
      AND "vendorId" = ${vendorId}
  `;
  return { deleted: true };
}

export async function agreeInstallmentPolicy(
  customerId: string,
  installmentId: string,
) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      customerId: string;
      policyTemplateContent: string | null;
      policyAcceptedAt: Date | null;
    }>
  >`
    SELECT "id", "customerId", "policyTemplateContent", "policyAcceptedAt"
    FROM "Installment"
    WHERE "id" = ${installmentId}
    LIMIT 1
  `;

  const installment = rows[0];

  if (!installment) {
    throw new ApiError("Installment plan not found", 404);
  }
  if (installment.customerId !== customerId) {
    throw new ApiError(
      "You can only accept policy for your own installment",
      403,
    );
  }
  if (!installment.policyTemplateContent) {
    throw new ApiError(
      "No policy template was applied to this installment",
      400,
    );
  }

  if (installment.policyAcceptedAt) {
    return { acceptedAt: installment.policyAcceptedAt.toISOString() };
  }

  await prisma.$executeRaw`
    UPDATE "Installment"
    SET "policyAcceptedAt" = NOW()
    WHERE "id" = ${installmentId}
      AND "customerId" = ${customerId}
  `;

  return { acceptedAt: new Date().toISOString() };
}

export async function createVendorCustomer(
  vendorId: string,
  input: CreateVendorCustomerInput,
) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phone = input.phone.trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "CUSTOMER") {
    throw new ApiError("This email belongs to a non-customer account", 409);
  }

  const customer =
    existing ??
    (await prisma.user.create({
      data: {
        name,
        email,
        role: "CUSTOMER",
        passwordHash: await hashPassword(randomUUID()),
      },
    }));

  if (!existing && customer.id) {
    await logAudit({
      actorId: vendorId,
      action: "CUSTOMER_CREATED",
      entityType: "User",
      entityId: customer.id,
      metadata: {
        name,
        email,
        phone,
      },
    });
  }

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone,
    created: !existing,
  };
}

export async function createProductPackage(
  vendorId: string,
  input: CreateProductPackageInput,
) {
  const packageName = input.name.trim();
  const uniqueProductIds = Array.from(new Set(input.productIds));

  if (uniqueProductIds.length === 0) {
    throw new ApiError("Select at least one product", 422);
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: uniqueProductIds },
      vendorId,
    },
    select: { id: true, name: true, price: true },
  });

  if (products.length !== uniqueProductIds.length) {
    throw new ApiError("One or more selected products are invalid", 422);
  }

  const baseTotal = products.reduce(
    (sum, product) => sum + Number(product.price),
    0,
  );
  const pricingMode = input.pricingMode;
  const discountPercent = Number(input.discountPercent ?? 0);
  const manualFinalPrice = Number(input.finalPrice ?? 0);

  if (pricingMode === "DISCOUNT") {
    if (
      !Number.isFinite(discountPercent) ||
      discountPercent <= 0 ||
      discountPercent > 100
    ) {
      throw new ApiError(
        "Discount percent must be greater than 0 and up to 100",
        422,
      );
    }
  }

  if (pricingMode === "MANUAL") {
    if (!Number.isFinite(manualFinalPrice) || manualFinalPrice <= 0) {
      throw new ApiError("Final package price must be greater than zero", 422);
    }
  }

  if (pricingMode === "NO_DISCOUNT") {
    if (!Number.isFinite(baseTotal) || baseTotal <= 0) {
      throw new ApiError("Package total must be greater than zero", 422);
    }
  }

  const discountAmount =
    pricingMode === "DISCOUNT" ? (baseTotal * discountPercent) / 100 : 0;
  const finalTotal =
    pricingMode === "MANUAL"
      ? manualFinalPrice
      : Math.max(0, baseTotal - discountAmount);

  const existingPackage = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ProductPackage"
    WHERE "vendorId" = ${vendorId}
      AND LOWER("name") = LOWER(${packageName})
    LIMIT 1
  `;

  if (existingPackage.length > 0) {
    throw new ApiError("A package with this name already exists", 409);
  }

  const created = await prisma.$transaction(async (tx) => {
    const packageProduct = await tx.product.create({
      data: {
        vendorId,
        name: packageName,
        price: finalTotal,
      },
    });

    const inserted = await tx.$queryRaw<
      Array<{
        id: string;
        name: string;
        createdAt: Date;
        packageProductId: string;
      }>
    >`
      INSERT INTO "ProductPackage" (
        "id",
        "vendorId",
        "name",
        "baseTotal",
        "discountAmount",
        "finalTotal",
        "packageProductId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${vendorId},
        ${packageName},
        ${baseTotal},
        ${discountAmount},
        ${finalTotal},
        ${packageProduct.id},
        NOW(),
        NOW()
      )
      RETURNING "id", "name", "createdAt", "packageProductId"
    `;

    const createdPackage = inserted[0];
    for (const productId of uniqueProductIds) {
      await tx.$executeRaw`
        INSERT INTO "ProductPackageItem" ("id", "packageId", "productId", "createdAt")
        VALUES (${randomUUID()}, ${createdPackage.id}, ${productId}, NOW())
      `;
    }

    return createdPackage;
  });

  await logAudit({
    actorId: vendorId,
    action: "PRODUCT_PACKAGE_CREATED",
    entityType: "Product",
    entityId: created.packageProductId,
    metadata: {
      packageName,
      productIds: uniqueProductIds,
      productCount: uniqueProductIds.length,
      baseTotal,
      discountAmount,
      discountPercent: pricingMode === "DISCOUNT" ? discountPercent : 0,
      finalTotal,
      pricingMode,
    },
  });

  return {
    id: created.id,
    name: created.name,
    productId: created.packageProductId,
    baseTotal: Number(baseTotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    discountPercent: Number(
      (pricingMode === "DISCOUNT" ? discountPercent : 0).toFixed(2),
    ),
    finalTotal: Number(finalTotal.toFixed(2)),
    pricingMode,
    productCount: uniqueProductIds.length,
    products,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function listProductPackages(vendorId: string) {
  const packages = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      createdAt: Date;
      productCount: bigint;
      baseTotal: unknown;
      discountAmount: unknown;
      finalTotal: unknown;
      packageProductId: string | null;
    }>
  >`
    SELECT
      p."id",
      p."name",
      p."baseTotal",
      p."discountAmount",
      p."finalTotal",
      p."packageProductId",
      p."createdAt",
      COUNT(i."id")::bigint AS "productCount"
    FROM "ProductPackage" p
    LEFT JOIN "ProductPackageItem" i ON i."packageId" = p."id"
    WHERE p."vendorId" = ${vendorId}
    GROUP BY p."id"
    ORDER BY p."createdAt" DESC
  `;

  return packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    productId: pkg.packageProductId,
    baseTotal: Number(pkg.baseTotal ?? 0),
    discountAmount: Number(pkg.discountAmount ?? 0),
    finalTotal: Number(pkg.finalTotal ?? 0),
    productCount: Number(pkg.productCount),
    createdAt: pkg.createdAt.toISOString(),
  }));
}
