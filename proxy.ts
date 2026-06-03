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

/** Exact paths that are always publicly accessible. */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/pricing",
  "/api/health",
]);

/** Route prefixes that are always public */
const PUBLIC_PREFIXES = [
  "/api/auth",            // NextAuth internal endpoints
  "/api/v1/public",       // Public API endpoints
  "/api/resume",          // Guest & public resume intelligence api
  "/resume",              // Guest & public resume routes
  "/_next",               // Next.js static/chunks
  "/demo",                // Demo pages (no auth required)
  "/auth",                // Auth pages (signup, callback, etc.)
  "/onboarding",          // Onboarding flow
  "/roles",               // Role market maps (public)
  "/favicon",
  "/robots.txt",
  "/sitemap",
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ── Proxy handler ───────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths through without auth check
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check session via JWT (edge-safe, no DB call)
  // auth() with no args returns the session in Next.js 16 proxy context
  const session = await auth();
  const isAuthenticated = !!session?.user?.id;

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect unauthenticated users to the demo ATS page
    const demoUrl = new URL("/demo/ats", request.url);
    return NextResponse.redirect(demoUrl);
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
     * - Files with an extension (e.g. .png, .svg, .ico, .webp)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
