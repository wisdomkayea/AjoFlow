import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { roleHomePath } from "@/lib/role-routes";

const PROTECTED_PREFIXES = [
  "/dashboards/group-admin",
  "/dashboards/group-member",
  "/dashboards/vendor-hub",
  "/dashboards/vendor-customer"
];
const PUBLIC_AUTH_PAGES = ["/login", "/signup"];

const ROLE_PREFIXES: { prefix: string; role: "ADMIN" | "MEMBER" | "VENDOR" | "CUSTOMER" }[] = [
  { prefix: "/dashboards/group-admin", role: "ADMIN" },
  { prefix: "/dashboards/group-member", role: "MEMBER" },
  { prefix: "/dashboards/vendor-hub", role: "VENDOR" },
  { prefix: "/dashboards/vendor-customer", role: "CUSTOMER" }
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = PUBLIC_AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && session) {
    const url = req.nextUrl.clone();
    url.pathname = roleHomePath(session.role);
    return NextResponse.redirect(url);
  }

  if (session) {
    const roleMatch = ROLE_PREFIXES.find((entry) => pathname.startsWith(entry.prefix));
    if (roleMatch && roleMatch.role !== session.role) {
      const url = req.nextUrl.clone();
      url.pathname = roleHomePath(session.role);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboards/group-admin/:path*",
    "/dashboards/group-member/:path*",
    "/dashboards/vendor-hub/:path*",
    "/dashboards/vendor-customer/:path*",
    "/login",
    "/signup"
  ]
};
