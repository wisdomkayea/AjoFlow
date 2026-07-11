import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(2).max(120),
  contributionAmount: z.number().positive(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  startDate: z.coerce.date(),
  totalMembers: z.number().int().min(2).max(500)
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  payoutOrder: z.number().int().min(1).optional() // omit to auto-assign next slot
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
