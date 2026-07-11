import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { recordPaymentSchema } from "@/lib/validation/vendor";
import { recordPayment } from "@/services/vendorService";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("VENDOR");
  const body = await req.json();
  const input = recordPaymentSchema.parse(body);
  const result = await recordPayment(session.sub, input);
  return ok(result, 201);
});
