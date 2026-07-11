import { withErrorHandling, ok, fail } from "@/lib/api-response";
import { requireSession } from "@/lib/session";
import { getAdminDashboard } from "@/services/dashboardService";
import { getVendorDashboard } from "@/services/vendorService";

export const GET = withErrorHandling(async () => {
  const session = await requireSession();
  if (session.role === "ADMIN") {
    return ok(await getAdminDashboard(session.sub));
  }
  if (session.role === "VENDOR") {
    return ok(await getVendorDashboard(session.sub));
  }
  return fail("Dashboard not available for this role", 400);
});
