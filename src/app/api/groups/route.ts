import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole, requireSession } from "@/lib/session";
import { createGroupSchema } from "@/lib/validation/group";
import { createGroup, listGroupsForUser } from "@/services/groupService";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("ADMIN");
  const body = await req.json();
  const input = createGroupSchema.parse(body);
  const group = await createGroup(session.sub, input);
  return ok(group, 201);
});

export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  const groups = await listGroupsForUser(session.sub, session.role);
  return ok(groups);
});
