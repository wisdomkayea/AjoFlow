import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { recordContributionSchema } from "@/lib/validation/contribution";
import { recordContribution } from "@/services/contributionService";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("ADMIN");
  const body = await req.json();
  const input = recordContributionSchema.parse(body);
  const contribution = await recordContribution(session.sub, input);
  return ok(contribution, 201);
});
