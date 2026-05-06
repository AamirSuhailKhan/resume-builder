import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { useResumeStore } from "@/store/useResumeStore";

/**
 * useRealtimeResume - Stable, singleton-guarded hook for DB synchronization.
 * Prevents memory leaks, double subscriptions, and stale updates.
 */
export function useRealtimeResume(userId: string | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // 1. Guard: Only subscribe if we have an authenticated user ID
    if (!userId) return;

    // 2. Singleton: Never allow two concurrent subscriptions for the same hook instance
    if (channelRef.current) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const handleUpdate = (payload: any) => {
      const store = useResumeStore.getState();
      const record = payload.new as any;

      if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
        const current = store.resumesById[record.id];
        
        // 🔥 FIX 4: Realtime Dedupe - ignore stale or identical updates
        if (current?.updatedAt && record.updated_at) {
          const currentTs = new Date(current.updatedAt).getTime();
          const incomingTs = new Date(record.updated_at).getTime();
          if (incomingTs <= currentTs) return; 
        }
        
        store.upsertResume(record, true); 
      } else if (payload.eventType === "DELETE") {
        const id = payload.old?.id;
        if (id) store.deleteResume(id).catch(() => {});
      }
    };

    const channel = supabase
      .channel(`resumes-sync-${userId}`)
      .on(
        "postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "resumes", 
          filter: `user_id=eq.${userId}` 
        }, 
        handleUpdate
      )
      .on("system", { event: "disconnect" }, () => {
        console.warn("[Realtime] Socket disconnected, auto-reconnect pending...");
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Subscribed to changes.");
        } else if (status === "CLOSED") {
          console.warn("[Realtime] Connection closed safely.");
        } else if (status === "CHANNEL_ERROR") {
          console.warn("[Realtime] Non-fatal channel error.");
        }
      });

    channelRef.current = channel;

    // 3. Clean Unmount: 🔥 FIX 6 - Ensure proper disposal
    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (e) {
          console.warn("[Realtime] Cleanup warning (non-fatal):", e);
        } finally {
          channelRef.current = null;
        }
      }
    };
  }, [userId]);
}
