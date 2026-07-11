import { z } from "zod";

export const recordContributionSchema = z.object({
  groupId: z.string().min(1),
  memberId: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(["PAID", "PENDING", "MISSED"]).default("PENDING")
});

export type RecordContributionInput = z.infer<typeof recordContributionSchema>;
