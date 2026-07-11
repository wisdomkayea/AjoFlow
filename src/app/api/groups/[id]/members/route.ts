import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { addMemberSchema } from "@/lib/validation/group";
import { addMember } from "@/services/groupService";

export const POST = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const session = await requireRole("ADMIN");
  const body = await req.json();
  const input = addMemberSchema.parse(body);
  const member = await addMember(params.id, session.sub, input);
  return ok(member, 201);
});
