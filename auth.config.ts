import type { NextAuthConfig } from "next-auth";

const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user?.id;
    },
  },
};

export default authConfig;
