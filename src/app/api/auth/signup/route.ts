import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/api-response";
import { signupSchema } from "@/lib/validation/auth";
import { signup } from "@/services/authService";
import { SESSION_COOKIE } from "@/lib/auth";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json();
  const input = signupSchema.parse(body);
  const { token, user } = await signup(input);

  const res = ok({ user }, 201);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
});
