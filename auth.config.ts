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
    authorized({ auth }) {
      return !!auth?.user?.id;
    },
  },
};

export default authConfig;
