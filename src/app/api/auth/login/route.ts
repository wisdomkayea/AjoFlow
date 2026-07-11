import { withErrorHandling, ok } from "@/lib/api-response";
import { loginSchema } from "@/lib/validation/auth";
import { login } from "@/services/authService";
import { SESSION_COOKIE } from "@/lib/auth";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json();
  const input = loginSchema.parse(body);
  const { token, user } = await login(input);

  const res = ok({ user });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
});
