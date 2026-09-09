import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_FILE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".gif",
  ".webp",
  ".ico",
  ".css",
  ".js",
  ".map",
  ".woff",
  ".woff2",
  ".ttf",
];

// Every page in the (mobile) route group — admin fleet/user/report tooling
// — except the auth pages, which live in the same route group but must
// stay reachable by anyone. Next.js route groups are invisible in the
// actual URL, so there's no way to express "protect the (mobile) group"
// structurally here; this list has to be kept in sync with that folder by
// hand. A Field Agent hitting any of these (typed URL, stale link, etc.)
// is bounced to /scan before the page ever renders.
const ADMIN_ONLY_PREFIXES = [
  "/dashboard",
  "/locations",
  "/reports",
  "/settings",
  "/machines",
  "/users",
  "/cash",
  "/packets",
  "/inventory-logs",
  "/assignments",
  "/stores",
  "/audit-log",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Next.js static assets, API proxy, and media files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  ) {
    return NextResponse.next();
  }

  // 2. Check for auth token cookie
  const token = request.cookies.get("auth-token")?.value;
  // Routing hint only, never an authorization check — see the comment on
  // where this cookie is set (useAuthStore.setAuth) for why that's safe.
  const role = request.cookies.get("user-role")?.value;
  const homePath = role === "ADMIN" ? "/dashboard" : "/scan";

  // 3. Check public auth pages
  const isAuthPage = pathname === "/login" || pathname === "/forgot-password";

  // 4. If logged-in user visits auth pages, redirect to their actual home
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  // 5. Strict Route Protection: if unauthenticated user accesses protected route, redirect to /login
  if (!isAuthPage && !token) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const loginUrl = new URL("/login", request.url);
    const redirectParam = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("redirect", redirectParam);
    return NextResponse.redirect(loginUrl);
  }

  // 6. RBAC: a non-Admin hitting an admin-only page is redirected to their
  // designated home instead of ever seeing it, regardless of how they got
  // there (typed URL, bookmark, stale link).
  if (
    token &&
    role &&
    role !== "ADMIN" &&
    ADMIN_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return NextResponse.redirect(new URL("/scan", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and favicon
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
