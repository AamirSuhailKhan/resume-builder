import { getSupabase } from "@/lib/supabase";
import { ResumeData } from "@/lib/storage";
import { normalizeResume } from "@/lib/normalizeResume";
import { withRetry } from "@/lib/withRetry";

// ─── Types ────────────────────────────────────────────────────────────────────

type DBResult<T> = { data: T; error: null } | { data: null; error: string };

// ─── Helper: get current user_id ─────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

// ─── getResumes ───────────────────────────────────────────────────────────────

/**
 * Fetch all resumes belonging to the current user.
 * RLS enforces user_id isolation at DB level — this filter is belt-and-suspenders.
 */
export async function getResumes(): Promise<DBResult<ResumeData[]>> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: "Supabase is not configured. Check your .env.local file." };
  }

  const userId = await getUserId();
  if (!userId) {
    return { data: null, error: "Not authenticated. Please sign in." };
  }

  try {
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
    });

    if (error) {
      console.error("[getResumes] DB error:", error.message);
      return { data: null, error: error.message };
    }

    const resumes: ResumeData[] = (data ?? []).map((row: Record<string, unknown>) =>
      normalizeResume(row.data ?? row)
    );

    console.info("[getResumes] Loaded", resumes.length, "resumes for user:", userId);
    return { data: resumes, error: null };
  } catch (e: unknown) {
    console.error("[getResumes] Unexpected:", e);
    return { data: null, error: e instanceof Error ? e.message : "Unknown error fetching resumes" };
  }
}

// ─── saveResume ───────────────────────────────────────────────────────────────

/**
 * Upsert a resume. Always attaches the authenticated user_id.
 */
export async function saveResume(resume: ResumeData): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase is not configured." };

  const userId = await getUserId();
  if (!userId) return { error: "Not authenticated. Please sign in." };

  try {
    const { error } = await withRetry(async () => {
      return await supabase.from("resumes").upsert(
        {
          id: resume.id,
          title: resume.title || "Untitled Resume",
          data: resume,
          user_id: userId,
          // created_at is set on first insert; updated_at is always refreshed.
          // Using .upsert with onConflict:"id" means created_at is preserved on update.
          created_at: resume.createdAt ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    });

    if (error) {
      console.error("[saveResume] DB error:", error.message);
      return { error: error.message };
    }

    console.info("[saveResume] Saved:", resume.id, "for user:", userId);
    return { error: null };
  } catch (e: unknown) {
    console.error("[saveResume] Unexpected:", e);
    return { error: e instanceof Error ? e.message : "Unknown error saving resume" };
  }
}

// ─── deleteResume ─────────────────────────────────────────────────────────────

/**
 * Delete a resume by ID. RLS ensures users can only delete their own records.
 */
export async function deleteResume(id: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase is not configured." };

  const userId = await getUserId();
  if (!userId) return { error: "Not authenticated. Please sign in." };

  try {
    const { error } = await withRetry(async () => {
      return await supabase
        .from("resumes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId); // Belt-and-suspenders even with RLS
    });

    if (error) {
      console.error("[deleteResume] DB error:", error.message);
      return { error: error.message };
    }

    console.info("[deleteResume] Deleted:", id);
    return { error: null };
  } catch (e: unknown) {
    console.error("[deleteResume] Unexpected:", e);
    return { error: e instanceof Error ? e.message : "Unknown error deleting resume" };
  }
}

// ─── createEmptyResume ────────────────────────────────────────────────────────

export function createEmptyResume(): ResumeData {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "Untitled Resume",
    template: "modern",
    personal: { name: "", email: "", phone: "", location: "", summary: "" },
    experience: [],
    education: [],
    skills: [],
    createdAt: now,
    updatedAt: now,
  };
}
