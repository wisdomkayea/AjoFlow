import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole, requireSession } from "@/lib/session";
import { createInstallmentSchema } from "@/lib/validation/vendor";
import { createInstallmentPlan, getCustomerInstallments, listVendorInstallments } from "@/services/vendorService";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("VENDOR");
  const body = await req.json();
  const input = createInstallmentSchema.parse(body);
  const installment = await createInstallmentPlan(session.sub, input);
  return ok(installment, 201);
});

export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  const installments =
    session.role === "VENDOR"
      ? await listVendorInstallments(session.sub)
      : await getCustomerInstallments(session.sub);
  return ok(installments);
});
