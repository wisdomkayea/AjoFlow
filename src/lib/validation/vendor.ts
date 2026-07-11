import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(160),
  price: z.number().positive(),
  imageDataUrl: z
    .string()
    .startsWith("data:image/", "Product image must be an image file")
    .max(2_000_000, "Product image is too large")
    .optional()
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
  downPaymentValue: z.number().min(0).optional()
});

export const recordPaymentSchema = z.object({
  installmentId: z.string().min(1),
  amount: z.number().positive()
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateInstallmentInput = z.infer<typeof createInstallmentSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
