import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { createWithdrawalSchema } from "@/lib/validation/vendor";
import { createWalletWithdrawal } from "@/services/vendorService";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("VENDOR");
  const body = await req.json();
  const input = createWithdrawalSchema.parse(body);
  const withdrawal = await createWalletWithdrawal(session.sub, input);
  return ok(withdrawal, 201);
});
