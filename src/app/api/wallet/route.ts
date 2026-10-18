import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { getVendorWallet } from "@/services/vendorService";

export const GET = withErrorHandling(async () => {
  const session = await requireRole("VENDOR");
  return ok(await getVendorWallet(session.sub));
});
