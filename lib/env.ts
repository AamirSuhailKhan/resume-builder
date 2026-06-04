import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // ── Database ─────────────────────────────────
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  DIRECT_URL: z.string().url().optional(),

  // ── Redis / Queue ─────────────────────────────
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ── Auth ──────────────────────────────────────
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ── AI Providers ──────────────────────────────
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  COACH_NAME: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),

  // ── Search ────────────────────────────────────
  MEILISEARCH_HOST: z.string().url().optional(),
  MEILISEARCH_KEY: z.string().optional(),

  // ── Observability ─────────────────────────────
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // ── Admin ─────────────────────────────────────
  ADMIN_API_KEY: z.string().optional(),

  // ── Legacy (Supabase — kept for compatibility) ─
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

// Fail fast: this will throw and crash the process if env vars are invalid
export const env = envSchema.parse(process.env);

export function getAuthSecret(): string {
  return env.AUTH_SECRET;
}

export function getAuthUrl(): string {
  return env.AUTH_URL || "http://localhost:3000";
}

export function getGoogleOAuthConfig(): { clientId: string; clientSecret: string } | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

export function getDatabaseUrl(): string {
  return env.DATABASE_URL;
}

export function getRedisUrl(): string | null {
  return env.REDIS_URL || null;
}
