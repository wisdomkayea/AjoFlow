import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, SessionPayload } from "./auth";
import { ApiError } from "./api-response";
import { createClient as createSupabaseClient } from "./server";
import type { Role } from "@/types";

/**
 * Reads and verifies the session cookie for the current request.
 * Returns null when there is no valid session (do not throw here so
 * callers can decide how to handle anonymous access).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    const session = await verifySession(token);
    if (session) return session;
  }

  try {
    const supabase = await createSupabaseClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user?.email) return null;

    const role = normalizeRole(user.user_metadata?.role);
    if (!role) return null;

    return {
      sub: user.id,
      email: user.email,
      role,
      name: String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email)
    };
  } catch {
    return null;
  }
}

/** Requires a valid session; throws a 401 ApiError otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError("Authentication required", 401);
  return session;
}

/** Requires a valid session AND one of the allowed roles; throws 403 otherwise. */
export async function requireRole(...roles: SessionPayload["role"][]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw new ApiError(`This action requires role: ${roles.join(" or ")}`, 403);
  }
  return session;
}

function normalizeRole(value: unknown): Role | null {
  if (value === "ADMIN" || value === "MEMBER" || value === "VENDOR" || value === "CUSTOMER") {
    return value;
  }

  return null;
}
