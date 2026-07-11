"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch } from "@/lib/api-client";
import type { SessionUser } from "@/types";

export function DashboardShell({
  children
}: {
  children: React.ReactNode | ((session: SessionUser) => React.ReactNode);
}) {
  const [session, setSession] = useState<SessionUser | null | undefined>(undefined);
  const router = useRouter();

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
        <aside className="hidden w-64 border-r border-line bg-white/80 p-6 md:block">
          <Skeleton className="h-8 w-32" />
          <div className="mt-8 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-4/5" />
          </div>
        </aside>
        <main className="max-w-6xl flex-1 space-y-6 px-4 pb-8 pt-24 sm:px-6 md:ml-64 md:px-10 md:py-10">
          <Skeleton className="h-8 w-56" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} name={session.name} />
      <main className="max-w-6xl flex-1 px-4 pb-8 pt-24 sm:px-6 md:ml-64 md:px-10 md:py-10">
        {typeof children === "function" ? children(session) : children}
      </main>
    </div>
  );
}
