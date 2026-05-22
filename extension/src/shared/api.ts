import type { UserProfile } from "./types";

const BASE_URL = "https://careeros.in"; // TODO: update with real production domain

export async function fetchProfile(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/extension/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as UserProfile;
  } catch {
    return null;
  }
}

export async function saveJob(
  token: string,
  job: { title: string; company: string; url: string; source: string }
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/extension/save-job`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(job),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getMatchScore(
  token: string,
  jobDescription: string
): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/extension/match-score`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ description: jobDescription }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data?.score as number) ?? null;
  } catch {
    return null;
  }
}
