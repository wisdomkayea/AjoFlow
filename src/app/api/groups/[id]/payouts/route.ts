import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { generatePayoutSequence, getPayoutSchedule } from "@/services/payoutService";

export const GET = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const schedule = await getPayoutSchedule(params.id);
  return ok(schedule);
});

export const POST = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const session = await requireRole("ADMIN");
  const schedule = await generatePayoutSequence(params.id, session.sub);
  return ok(schedule, 201);
});
