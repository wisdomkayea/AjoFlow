"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar, getPageTitle } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/types";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode | ((session: SessionUser) => React.ReactNode);
}) {
  const [session, setSession] = useState<SessionUser | null | undefined>(
    undefined,
  );
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    apiFetch<{ session: SessionUser | null }>("/api/auth/me")
      .then((data) => {
        if (!data.session) {
          router.replace("/login");
        } else {
          setSession(data.session);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-line bg-white p-6 md:block">
          <Skeleton className="h-8 w-32" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-4/5" />
          </div>
        </aside>
        <div className="flex-1 md:ml-64">
          <div className="hidden h-[65px] border-b border-line/80 bg-white md:block" />
          <main className="max-w-6xl flex-1 space-y-6 px-4 pb-8 pt-24 sm:px-6 md:px-10 md:pt-10">
            <Skeleton className="h-8 w-56" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </main>
        </div>
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} name={session.name} />
      <div className="flex-1 md:ml-64">
        <TopNav
          title={getPageTitle(session.role, pathname)}
          name={session.name}
        />
        <main className="mx-auto max-w-6xl flex-1 px-4 pb-8 pt-24 sm:px-6 md:px-10 md:py-8">
          {typeof children === "function" ? children(session) : children}
        </main>
      </div>
    </div>
  );
}
