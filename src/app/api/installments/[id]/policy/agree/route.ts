import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { agreeInstallmentPolicy } from "@/services/vendorService";

export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const session = await requireRole("CUSTOMER");
    const result = await agreeInstallmentPolicy(session.sub, params.id);
    return ok(result, 201);
  },
);
