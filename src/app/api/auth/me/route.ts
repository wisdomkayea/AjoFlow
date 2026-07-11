import { withErrorHandling, ok } from "@/lib/api-response";
import { getSession } from "@/lib/session";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  return ok({ session });
});
