import { withErrorHandling, ok } from "@/lib/api-response";
import { requireSession } from "@/lib/session";
import { getGroupDetails, getGroupSummary } from "@/services/groupService";

export const GET = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  await requireSession();
  const url = new URL(req.url);
  const view = url.searchParams.get("view");

  if (view === "summary") {
    const summary = await getGroupSummary(params.id);
    return ok(summary);
  }

  const group = await getGroupDetails(params.id);
  return ok(group);
});
