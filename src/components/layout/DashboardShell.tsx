"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar, getPageTitle } from "./Sidebar";
import { TopNav } from "./TopNav";
import { apiFetch } from "@/lib/api-client";
import { cacheSession, getCachedSession } from "@/lib/session-cache";
import type { SessionUser } from "@/types";
import type { Role } from "@/types";

function inferRoleFromPathname(pathname: string): Role {
  if (pathname.startsWith("/dashboards/group-admin")) return "ADMIN";
  if (pathname.startsWith("/dashboards/group-member")) return "MEMBER";
  if (pathname.startsWith("/dashboards/vendor-hub")) return "VENDOR";
  if (pathname.startsWith("/dashboards/vendor-customer")) return "CUSTOMER";
  return "MEMBER";
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode | ((session: SessionUser) => React.ReactNode);
}) {
  const router = useRouter();
  const pathname = usePathname();
  const initialCachedSession = useMemo(() => getCachedSession(), []);
  const [session, setSession] = useState<SessionUser | null>(
    initialCachedSession ?? null,
  );
  const [isCheckingSession, setIsCheckingSession] = useState(
    initialCachedSession === undefined,
  );

  useEffect(() => {
    if (initialCachedSession !== undefined) {
      setIsCheckingSession(false);
      return;
    }

    apiFetch<{ session: SessionUser | null }>("/api/auth/me")
      .then((data) => {
        if (!data.session) {
          cacheSession(null);
          router.replace("/login");
        } else {
          cacheSession(data.session);
          setSession(data.session);
        }
      })
      .catch(() => {
        cacheSession(null);
        setSession(null);
        router.replace("/login");
      })
      .finally(() => setIsCheckingSession(false));
  }, [initialCachedSession, router]);

  if (!session && !isCheckingSession) return null;

  const shellSession: SessionUser = session ?? {
    sub: "",
    email: "",
    role: inferRoleFromPathname(pathname),
    name: "User",
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role={shellSession.role} name={shellSession.name} />
      <div className="flex-1 md:ml-64">
        <TopNav
          title={getPageTitle(shellSession.role, pathname)}
          name={shellSession.name}
        />
        <main className="mx-auto max-w-6xl flex-1 px-4 pb-8 pt-24 sm:px-6 md:px-10 md:py-8">
          {session
            ? typeof children === "function"
              ? children(session)
              : children
            : null}
        </main>
      </div>
    </div>
  );
}
