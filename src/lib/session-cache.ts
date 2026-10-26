import type { SessionUser } from "@/types";

const SESSION_CACHE_KEY = "kreddt.session.user";

let memorySession: SessionUser | null | undefined;

export function getCachedSession(): SessionUser | null | undefined {
  if (memorySession !== undefined) {
    return memorySession;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    memorySession = parsed;
    return parsed;
  } catch {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
    return undefined;
  }
}

export function cacheSession(session: SessionUser | null) {
  memorySession = session;

  if (typeof window === "undefined") {
    return;
  }

  if (session) {
    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  }
}

export function clearCachedSession() {
  memorySession = null;

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  }
}
