"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, Users, Store, LogOut, Landmark, ShoppingBag, Menu, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { roleHomePath } from "@/lib/role-routes";
import type { Role } from "@/types";
import { createClient } from "@/lib/client";

const NAV: Record<Role, { href: string; label: string; icon: any }[]> = {
  ADMIN: [
    { href: "/dashboards/group-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboards/group-admin/groups", label: "Groups", icon: Users }
  ],
  MEMBER: [
    { href: "/dashboards/group-member/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboards/group-member/groups", label: "My groups", icon: Users }
  ],
  VENDOR: [
    { href: "/dashboards/vendor-hub/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboards/vendor-hub/products", label: "Products", icon: ShoppingBag },
    { href: "/dashboards/vendor-hub/installments", label: "Installments", icon: Store },
  ],
  CUSTOMER: [
    { href: "/dashboards/vendor-customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboards/vendor-customer/installments", label: "My installments", icon: Store }
  ]
};

export function Sidebar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV[role] ?? NAV.MEMBER;

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    try {
      await createClient().auth.signOut();
    } catch {
      // Ignore Supabase sign-out failures; the local session cookie has already been cleared.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href={roleHomePath(role)} className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-forest-600" />
            <span className="font-display text-lg italic text-ink">AjoFlow</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-md border border-line bg-white p-2 text-ink/70"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-sidebar"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink/35 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        id="mobile-sidebar"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-xs flex-col border-r border-line/80 bg-[linear-gradient(180deg,#fbfcf8_0%,#f5f7f1_58%,#f3f2ea_100%)] px-4 py-6 transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link href={roleHomePath(role)} className="mb-8 flex items-center gap-2 px-2">
          <Landmark className="h-5 w-5 text-forest-600" />
          <span className="font-display text-lg italic text-ink">AjoFlow</span>
        </Link>

        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-forest-600 text-white shadow-[0_6px_20px_-12px_rgba(15,27,20,0.6)]"
                    : "text-ink/70 hover:bg-white hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-lg border border-line/80 bg-white/70 p-3">
          <p className="px-3 text-xs uppercase tracking-wide text-ink/40">{role.toLowerCase()}</p>
          <p className="truncate px-3 text-sm font-medium text-ink">{name}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-ink/60 hover:bg-clay/10 hover:text-clay"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      <aside className="hidden h-screen w-64 flex-col overflow-y-auto border-r border-line/80 bg-[linear-gradient(180deg,#fbfcf8_0%,#f5f7f1_58%,#f3f2ea_100%)] px-4 py-6 md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex">
        <Link href={roleHomePath(role)} className="mb-8 flex items-center gap-2 px-2">
          <Landmark className="h-5 w-5 text-forest-600" />
          <span className="font-display text-lg italic text-ink">AjoFlow</span>
        </Link>

        <nav className="flex-1 space-y-1.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-forest-600 text-white shadow-[0_6px_20px_-12px_rgba(15,27,20,0.6)]"
                    : "text-ink/70 hover:bg-white hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-lg border border-line/80 bg-white/70 p-3">
          <p className="px-3 text-xs uppercase tracking-wide text-ink/40">{role.toLowerCase()}</p>
          <p className="truncate px-3 text-sm font-medium text-ink">{name}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-ink/60 hover:bg-clay/10 hover:text-clay"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}
