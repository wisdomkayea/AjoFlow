import { withErrorHandling, ok } from "@/lib/api-response";
import { requireRole } from "@/lib/session";
import { createProductPackageSchema } from "@/lib/validation/vendor";
import {
  createProductPackage,
  listProductPackages,
} from "@/services/vendorService";

export const GET = withErrorHandling(async () => {
  const session = await requireRole("VENDOR");
  const packages = await listProductPackages(session.sub);
  return ok(packages);
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await requireRole("VENDOR");
  const body = await req.json();
  const input = createProductPackageSchema.parse(body);
  const createdPackage = await createProductPackage(session.sub, input);
  return ok(createdPackage, 201);
});
