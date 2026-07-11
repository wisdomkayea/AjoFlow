import { withErrorHandling, ok } from "@/lib/api-response";
import { SESSION_COOKIE } from "@/lib/auth";

export const POST = withErrorHandling(async () => {
  const res = ok({ loggedOut: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
});
