import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { createPolicyTemplateSchema } from "@/lib/validation/vendor";
import {
  createVendorPolicyTemplate,
  listVendorPolicyTemplates,
} from "@/services/vendorService";

export const GET = withErrorHandling(async () => {
  const session = await requireRole("VENDOR");
  const templates = await listVendorPolicyTemplates(session.sub);
  return ok(templates);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("VENDOR");
  const body = await req.json();
  const input = createPolicyTemplateSchema.parse(body);
  const created = await createVendorPolicyTemplate(session.sub, input);
  return ok(created, 201);
});
