import { withErrorHandling, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/session";
import { listContributionsForGroup } from "@/services/contributionService";

export const GET = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireSession();
  const contributions = await listContributionsForGroup(params.id);
  return ok(contributions);
});
