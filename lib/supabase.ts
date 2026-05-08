import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Lazy singleton — created only once on first call, never at module load.
let client: ReturnType<typeof createBrowserClient> | null = null;
let loggedOnce = false;

function isValidConfig(): boolean {
  return Boolean(url && url.startsWith("https://") && key && key.length > 10);
}

/**
 * Returns the Supabase browser client singleton.
 * Returns null and logs once if env vars are missing/invalid.
 * NEVER throws at module level.
 */
export function getSupabase() {
  if (!isValidConfig()) {
    if (!loggedOnce) {
      console.error(
        "❌ Supabase config invalid. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local"
      );
      loggedOnce = true;
    }
    return null;
  }

  if (!client) {
    client = createBrowserClient(url, key);
    console.info("Supabase browser client initialized");
  }

  return client;
}

/**
 * Returns the currently signed-in user, or null.
 * Safe to call anywhere — never throws.
 */
export async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Signs the current user out. Returns { error } or { error: null }.
 */
export async function signOut(): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Unknown sign-out error" };
  }
}

/**
 * Trigger Google OAuth sign-in.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return { error: error?.message ?? null };
}
