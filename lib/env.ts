import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // ── Database ─────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  // ── Redis / Queue ─────────────────────────────
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ── Auth ──────────────────────────────────────
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ── AI Providers ──────────────────────────────
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // ── Search ────────────────────────────────────
  MEILISEARCH_HOST: z.string().url().optional(),
  MEILISEARCH_KEY: z.string().optional(),

  // ── Observability ─────────────────────────────
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // ── Admin ─────────────────────────────────────
  ADMIN_API_KEY: z.string().optional(),

  // ── Legacy (Supabase — kept for compatibility) ─
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

let envParsed: z.infer<typeof envSchema> | null = null;

try {
  // Try to parse environment variables.
  // We provide fallbacks from alternative names for compatibility.
  envParsed = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV !== "production" ? "dev-only-insecure-auth-secret-32b" : undefined),
    AUTH_URL: process.env.AUTH_URL || process.env.NEXTAUTH_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("[ENV] Invalid environment variables:", error.flatten().fieldErrors);
    // Don't crash immediately in browser or some Next.js build steps, 
    // but in a real node environment we might want to process.exit(1)
  } else {
    console.error("[ENV] Failed to parse environment", error);
  }
}

export const env = envParsed!;

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

