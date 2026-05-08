import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getAuthSecret, getGoogleOAuthConfig } from "@/lib/env";
import authConfig from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

const googleOAuth = getGoogleOAuthConfig();

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      try {
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;

        const validPassword = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!validPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      } catch (error) {
        console.error("[AUTH] Credentials DB lookup failed", error);
        return null;
      }
    },
  }),
];

if (googleOAuth) {
  providers.push(
    Google({
      clientId: googleOAuth.clientId,
      clientSecret: googleOAuth.clientSecret,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        console.warn("[AUTH] Invalid redirect URL", { url });
      }
      return `${baseUrl}/dashboard`;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.info("[AUTH] signIn", {
        userId: user.id,
        provider: account?.provider ?? "credentials",
        isNewUser,
      });
    },
    async signOut(message) {
      console.info("[AUTH] signOut", message);
    },
  },
  logger: {
    error(error) { console.error("[AUTH]", error); },
    warn(code) { console.warn("[AUTH]", code); },
    debug(code, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[AUTH]", code, metadata);
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
});
