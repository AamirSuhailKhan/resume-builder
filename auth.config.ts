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
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
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
        nextUrl.pathname.startsWith("/api/auth");

      if (!isPublic) {
        return isLoggedIn;
      }
      return true;
    },
  },
};

export default authConfig;
