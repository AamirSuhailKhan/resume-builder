import type { NextAuthConfig } from "next-auth";
import { getAuthSecret } from "@/lib/env";

const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  secret: getAuthSecret(),
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (user.id) token.sub = user.id;
        if (user.role) token.role = user.role;
        if (user.plan) token.plan = user.plan;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) || "USER";
        session.user.plan = (token.plan as string) || "free";
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/auth") ||
        nextUrl.pathname.startsWith("/demo") ||
        nextUrl.pathname.startsWith("/onboarding") ||
        nextUrl.pathname.startsWith("/roles") ||
        nextUrl.pathname.startsWith("/pricing") ||
        nextUrl.pathname.startsWith("/api/v1/public") ||
        nextUrl.pathname.startsWith("/api/resume") ||
        nextUrl.pathname.startsWith("/resume") ||
        nextUrl.pathname.startsWith("/api/auth");

      if (!isPublic) {
        return isLoggedIn;
      }
      return true;
    },
  },
};

export default authConfig;
