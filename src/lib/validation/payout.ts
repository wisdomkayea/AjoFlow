import { z } from "zod";

export const completePayoutSchema = z.object({
  groupId: z.string().min(1)
});

export type CompletePayoutInput = z.infer<typeof completePayoutSchema>;
