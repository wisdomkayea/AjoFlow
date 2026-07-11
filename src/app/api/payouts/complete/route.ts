import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { completePayoutSchema } from "@/lib/validation/payout";
import { completeNextPayout } from "@/services/payoutService";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("ADMIN");
  const body = await req.json();
  const input = completePayoutSchema.parse(body);
  const payout = await completeNextPayout(input.groupId, session.sub);
  return ok(payout);
});
