import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicRoutes = new Set(["/", "/login", "/auth/callback"]);
const protectedPrefixes = [
  "/dashboard",
  "/builder",
  "/job-optimizer",
  "/job-intelligence",
  "/ats",
  "/settings",
  "/matches",
  "/applications",
  "/auto-apply",
  "/analytics",
  "/portfolio",
  "/cover-letter",
  "/interview",
];

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth?.user?.id);
  const isPublicRoute = publicRoutes.has(pathname);
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isLoggedIn) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const target = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (isPublicRoute || isProtectedRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/font|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
