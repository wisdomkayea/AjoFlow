import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { createVendorCustomerSchema } from "@/lib/validation/vendor";
import { createVendorCustomer } from "@/services/vendorService";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("VENDOR");
  const body = await req.json();
  const input = createVendorCustomerSchema.parse(body);
  const customer = await createVendorCustomer(session.sub, input);
  return ok(customer, 201);
});
