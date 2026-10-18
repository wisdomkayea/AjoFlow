import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(160),
  price: z.number().positive(),
  imageDataUrl: z
    .string()
    .startsWith("data:image/", "Product image must be an image file")
    .max(2_000_000, "Product image is too large")
    .optional(),
});

export const createInstallmentSchema = z.object({
  productId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  totalAmount: z.number().positive().optional(),
  numberOfInstallments: z.number().int().min(1).max(60).optional(),
  repaymentFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  startDate: z.string().datetime().optional(),
  downPaymentType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  downPaymentValue: z.number().min(0).optional(),
  policyTemplateId: z.string().min(1).optional(),
});

export const recordPaymentSchema = z.object({
  installmentId: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().optional(),
  method: z.enum(["Cash", "Transfer"]).optional(),
  reference: z.string().min(1).max(120).optional(),
});

export const createWithdrawalSchema = z.object({
  amount: z.number().positive(),
  bankName: z.string().min(2).max(120),
  accountNumber: z.string().min(4).max(20),
  accountName: z.string().min(2).max(120).optional(),
});

export const createVendorCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
});

export const createProductPackageSchema = z.object({
  name: z.string().min(2).max(120),
  productIds: z.array(z.string().min(1)).min(1).max(100),
  pricingMode: z.enum(["NO_DISCOUNT", "DISCOUNT", "MANUAL"]),
  discountPercent: z.number().min(0).max(100).optional(),
  finalPrice: z.number().positive().optional(),
});

export const createPolicyTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  content: z.string().min(20).max(5000),
});

export const updatePolicyTemplateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  content: z.string().min(20).max(5000).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateInstallmentInput = z.infer<typeof createInstallmentSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
export type CreateVendorCustomerInput = z.infer<
  typeof createVendorCustomerSchema
>;
export type CreateProductPackageInput = z.infer<
  typeof createProductPackageSchema
>;
export type CreatePolicyTemplateInput = z.infer<
  typeof createPolicyTemplateSchema
>;
export type UpdatePolicyTemplateInput = z.infer<
  typeof updatePolicyTemplateSchema
>;
