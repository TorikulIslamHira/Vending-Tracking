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

  // 3. Check public auth pages
  const isAuthPage = pathname === "/login" || pathname === "/forgot-password";

  // 4. If logged-in user visits auth pages, redirect to /dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
