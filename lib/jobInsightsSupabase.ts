import { getSupabase } from "@/lib/supabase";
import { JobIntelligenceOutput } from "@/lib/job-intelligence/types";
import { withRetry } from "@/lib/withRetry";

export interface JobInsightsRow {
  id: string;
  resume_id: string;
  resume_hash: string;
  insights: JobIntelligenceOutput;
  job_count: number;
  engine_version: string;
  user_id?: string;
  created_at: string;
}

// ─── Helper: get current user_id ─────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Fetch the latest insights for a given resume ID.
 */
export async function getInsights(resumeId: string): Promise<{ data: JobInsightsRow | null, error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const userId = await getUserId();
  if (!userId) return { data: null, error: "Not authenticated" };

  const { data, error } = await withRetry(async () => {
    return await supabase
      .from("job_insights")
      .select("*")
      .eq("resume_id", resumeId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
  });

  if (error && error.code !== "PGRST116") {
    // PGRST116 = No rows returned
    console.error("Failed to fetch job insights:", error);
    return { data: null, error: error.message };
  }
  return { data: data as JobInsightsRow | null, error: null };
}

/**
 * Insert or update a job insights row.
 */
export async function saveInsights(row: Omit<JobInsightsRow, "created_at">): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const userId = await getUserId();
  if (!userId) return { error: "Not authenticated" };

  const payload = {
    ...row,
    user_id: userId,
    created_at: new Date().toISOString(),
  };

  const { error } = await withRetry(async () => {
    return await supabase.from("job_insights").upsert(payload, {
      onConflict: "resume_id,resume_hash,engine_version",
    });
  });

  if (error) {
    console.error("Failed to save job insights:", error);
    return { error: error.message };
  }

  return { error: null };
}
