"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

export default function TestPage() {
  // Simple sanity check that Supabase can read the "resumes" table.
  async function testConnection() {
    const supabase = getSupabase();
    if (!supabase) {
      console.log("ERROR: Supabase not configured");
      return;
    }
    const { data, error } = await supabase.from("resumes").select("*");
    console.log("DATA:", data);
    console.log("ERROR:", error);
  }

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Testing Supabase Connection...</h1>
      <p>Open the browser console (F12) to see the query result.</p>
    </div>
  );
}