/**
 * proxy.ts — Next.js 16 edge proxy (replaces middleware.ts)
 *
 * MUST export a function named `proxy` (Next.js 16 requirement).
 * MUST be edge-compatible: no Prisma, no bcrypt, no Node crypto.
 *
 * Uses the lightweight authConfig (JWT + callbacks only) via NextAuth's
 * split-config pattern. The full Prisma-backed auth lives in auth.ts
 * and is used only in Server Components / API routes (Node runtime).
 */
import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// ── Route classification ────────────────────────────────────────────────────

/** Routes that are always publicly accessible. */
const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/auth/callback",
]);

/** Route prefixes that are always public (API, static assets, etc.) */
const PUBLIC_PREFIXES = [
  "/api/auth",       // NextAuth internal endpoints
  "/_next",          // Next.js static/chunks
  "/favicon",
  "/robots.txt",
  "/sitemap",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ── Proxy handler ───────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths through without auth check
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Check session via JWT (edge-safe, no DB call)
  const session = await auth();
  const isAuthenticated = !!session?.user?.id;

  if (!isAuthenticated) {
    // Preserve the intended destination for post-login redirect
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ── Matcher ─────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - Files with an extension (e.g. .png, .svg, .ico)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
