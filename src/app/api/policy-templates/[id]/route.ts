import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { updatePolicyTemplateSchema } from "@/lib/validation/vendor";
import {
  deleteVendorPolicyTemplate,
  updateVendorPolicyTemplate,
} from "@/services/vendorService";

export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const session = await requireRole("VENDOR");
    const body = await req.json();
    const input = updatePolicyTemplateSchema.parse(body);
    const updated = await updateVendorPolicyTemplate(
      session.sub,
      params.id,
      input,
    );
    return ok(updated);
  },
);

export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const session = await requireRole("VENDOR");
    const result = await deleteVendorPolicyTemplate(session.sub, params.id);
    return ok(result);
  },
);
