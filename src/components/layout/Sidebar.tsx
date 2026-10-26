"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  Store,
  LogOut,
  Landmark,
  ShoppingBag,
  Layers,
  Wallet,
  Settings,
  LifeBuoy,
  Menu,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { roleHomePath } from "@/lib/role-routes";
import { clearCachedSession } from "@/lib/session-cache";
import { Badge } from "@/components/ui/Badge";
import type { Role } from "@/types";
import { createClient } from "@/lib/client";
import KreddtIcon from "../../../assets/icons/Kreddt-icon.svg";
import Image from "next/image";

const NAV: Record<Role, { href: string; label: string; icon: any }[]> = {
  ADMIN: [
    {
      href: "/dashboards/group-admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    { href: "/dashboards/group-admin/groups", label: "Groups", icon: Users },
  ],
  MEMBER: [
    {
      href: "/dashboards/group-member/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboards/group-member/groups",
      label: "My groups",
      icon: Users,
    },
  ],
  VENDOR: [
    {
      href: "/dashboards/vendor-hub/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboards/vendor-hub/customers",
      label: "Customers",
      icon: Users,
    },
    {
      href: "/dashboards/vendor-hub/products",
      label: "Products",
      icon: ShoppingBag,
    },
    {
      href: "/dashboards/vendor-hub/installments",
      label: "Installments",
      icon: Layers,
    },
    { href: "/dashboards/vendor-hub/payment", label: "Payments", icon: Wallet },
    {
      href: "/dashboards/vendor-hub/settings",
      label: "Settings",
      icon: Settings,
    },
    {
      href: "/dashboards/vendor-hub/help",
      label: "Help and Support",
      icon: LifeBuoy,
    },
  ],
  CUSTOMER: [
    {
      href: "/dashboards/vendor-customer/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboards/vendor-customer/installments",
      label: "My installments",
      icon: Store,
    },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  VENDOR: "Vendor",
  CUSTOMER: "Customer",
};

export function getPageTitle(role: Role, pathname: string) {
  const items = NAV[role] ?? NAV.MEMBER;
  const match = items.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  return match?.label ?? "Dashboard";
}

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
    clearCachedSession();
    router.push("/login");
    router.refresh();
  }

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "U";

  const brand = (
    <Link
      href={roleHomePath(role)}
      className="mb-8 flex items-center gap-2 px-4 py-2 rounded-md border border-solid border-outline-base_em bg-surface-surface_0 shadow-[0_2.132px_3.197px_0_var(--color-white-7,rgba(255,255,255,0.07))_inset,0_-1.066px_3.197px_-1.066px_var(--neutral_inverse_white-alpha_7,rgba(0,0,0,0.07))_inset]"
    >
      <div>
        <Image src={KreddtIcon} alt="" width={45} height={45} />
      </div>
      <div className="flex flex-col items-center ">
        <span className="font-display text-sm font-semibold text-ink">
          Kreddt
        </span>
        <Badge tone={role === "VENDOR" ? "active" : "neutral"}>
          {ROLE_LABEL[role]}
        </Badge>
      </div>
    </Link>
  );

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-600 text-white"
                : "text-ink/60 hover:bg-forest-50 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const profile = (
    <div className="mt-4 flex items-center gap-3 border-t border-line/80 pt-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-ink/45">{role.toLowerCase()}</p>
      </div>
      <button
        onClick={handleLogout}
        className="shrink-0 rounded-md p-2 text-ink/40 hover:bg-clay/10 hover:text-clay"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href={roleHomePath(role)} className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-forest-600" />
            <span className="font-display text-lg font-semibold text-ink">
              Kreddt
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-md border border-line bg-white p-2 text-ink/70"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-sidebar"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/35 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-sidebar"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-xs flex-col border-r border-line/80 bg-white px-4 py-6 transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {brand}
        {nav}
        {profile}
      </aside>

      <aside className="hidden h-screen w-64 flex-col border-r border-line/80 bg-white px-4 py-6 md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex">
        {brand}
        {nav}
        {profile}
      </aside>
    </>
  );
}
