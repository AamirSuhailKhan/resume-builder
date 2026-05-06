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
  | "REDIS_URL"
  | "UPSTASH_REDIS_URL"
  | "GEMINI_API_KEY";

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

export function getRequiredEnv(name: EnvName) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`[ENV] Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: EnvName) {
  return readEnv(name);
}

export function getAuthSecret() {
  const secret = readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    warnOnce(
      "auth-secret-dev-fallback",
      "[ENV] Missing AUTH_SECRET/NEXTAUTH_SECRET. Using an insecure development-only fallback."
    );
    return "dev-only-insecure-auth-secret-32b";
  }

  throw new Error("[ENV] Missing AUTH_SECRET or NEXTAUTH_SECRET.");
}

export function getAuthUrl() {
  return readEnv("AUTH_URL") ?? readEnv("NEXTAUTH_URL") ?? "http://localhost:3000";
}

export function getGoogleOAuthConfig() {
  const clientId = readEnv("GOOGLE_CLIENT_ID") ?? readEnv("AUTH_GOOGLE_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET") ?? readEnv("AUTH_GOOGLE_SECRET");

  if (!clientId || !clientSecret) {
    warnOnce(
      "google-oauth-disabled",
      "[ENV] Google OAuth is disabled. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login."
    );
    return null;
  }

  return { clientId, clientSecret };
}

export function getDatabaseUrl() {
  return getRequiredEnv("DATABASE_URL");
}

export function getRedisUrl() {
  return readEnv("REDIS_URL") ?? readEnv("UPSTASH_REDIS_URL") ?? null;
}
