type EnvName =
  | "NEXTAUTH_SECRET"
  | "AUTH_SECRET"
  | "NEXTAUTH_URL"
  | "AUTH_URL"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "AUTH_GOOGLE_ID"
  | "AUTH_GOOGLE_SECRET"
  | "DATABASE_URL"
  | "DIRECT_URL"
  | "REDIS_URL"
  | "UPSTASH_REDIS_REST_URL"
  | "UPSTASH_REDIS_REST_TOKEN"
  | "GEMINI_API_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

declare global {
  var __resumeAiEnvWarnings: Set<string> | undefined;
}

function warnOnce(key: string, message: string) {
  globalThis.__resumeAiEnvWarnings ??= new Set<string>();
  if (globalThis.__resumeAiEnvWarnings.has(key)) return;
  globalThis.__resumeAiEnvWarnings.add(key);
  console.error(message);
}

function readEnv(name: EnvName) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getRequiredEnv(name: EnvName): string {
  const value = readEnv(name);
  if (!value) throw new Error(`[ENV] Missing required environment variable: ${name}`);
  return value;
}

export function getOptionalEnv(name: EnvName): string | undefined {
  return readEnv(name);
}

export function getAuthSecret(): string {
  const secret = readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    warnOnce("auth-secret-dev-fallback", "[ENV] Missing AUTH_SECRET. Using insecure dev fallback.");
    return "dev-only-insecure-auth-secret-32b";
  }

  throw new Error("[ENV] Missing AUTH_SECRET or NEXTAUTH_SECRET. Required in production.");
}

export function getAuthUrl(): string {
  const url = readEnv("AUTH_URL") ?? readEnv("NEXTAUTH_URL");
  if (url) return url;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[ENV] Missing AUTH_URL in production.\n" +
      "   Set AUTH_URL to your deployed app URL, e.g. https://yourapp.com"
    );
  }

  warnOnce("auth-url-dev-fallback", "[ENV] AUTH_URL not set. Defaulting to http://localhost:3000");
  return "http://localhost:3000";
}

export function getGoogleOAuthConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = readEnv("GOOGLE_CLIENT_ID") ?? readEnv("AUTH_GOOGLE_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET") ?? readEnv("AUTH_GOOGLE_SECRET");

  if (!clientId || !clientSecret) {
    warnOnce("google-oauth-disabled", "[ENV] Google OAuth disabled. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET.");
    return null;
  }

  return { clientId, clientSecret };
}

export function getDatabaseUrl(): string {
  return getRequiredEnv("DATABASE_URL");
}

export function getRedisUrl(): string | null {
  return readEnv("REDIS_URL") ?? null;
}
