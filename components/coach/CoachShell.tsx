"use client";

import type { UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import { CoachChat } from "@/components/coach/CoachChat";
import { CoachInput } from "@/components/coach/CoachInput";
import { CoachPaywall } from "@/components/coach/CoachPaywall";
import { CoachSidebar, type SessionListItem } from "@/components/coach/CoachSidebar";
import { useCoachChat } from "@/hooks/useCoachChat";
import { detectMockInterviewIntent } from "@/lib/coach/mock-interview";
import { storedMessagesFromJson, storedMessagesToUi } from "@/lib/coach/message-utils";
import { meetsPlan } from "@/lib/subscription/plans";
import type { SubscriptionPlan } from "@/lib/subscription/plans";
import type { StoredCoachMessage } from "@/lib/coach/types";

type TeaserData = {
  rejectionCount30d: number;
  patternTeaser: string;
  demoMessages: StoredCoachMessage[];
};

export function CoachShell({
  plan,
  userInitial,
  coachName,
  initialTeaser,
}: {
  plan: SubscriptionPlan;
  userInitial: string;
  coachName: string;
  initialTeaser: TeaserData;
}) {
  const isPro = meetsPlan(plan, "pro");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [demoMessages, setDemoMessages] = useState<UIMessage[]>(
    storedMessagesToUi(initialTeaser.demoMessages)
  );
 
  const chat = useCoachChat(sessionId, []);
 
  const displayMessages = isPro ? chat.messages : demoMessages;
  const isLoading = isPro && (chat.status === "streaming" || chat.status === "submitted");
 
  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/coach/sessions");
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    if (!isPro) return;
    const res = await fetch("/api/v1/coach/usage");
    if (!res.ok) return;
    const data = await res.json();
    setUsage({ used: data.used, limit: data.limit });
  }, [isPro]);

  useEffect(() => {
    void refreshSessions();
    void refreshUsage();
  }, [refreshSessions, refreshUsage]);

  useEffect(() => {
    if (isPro && chat.status === "ready") {
      void refreshSessions();
      void refreshUsage();
    }
  }, [isPro, chat.status, refreshSessions, refreshUsage]);

  async function createSession(): Promise<string> {
    const res = await fetch("/api/v1/coach/sessions", { method: "POST" });
    const data = await res.json();
    const id = data.session?.id as string;
    await refreshSessions();
    return id;
  }

  async function handleNewChat() {
    if (!isPro) return;
    const id = await createSession();
    setSessionId(id);
    chat.setMessages([]);
  }

  async function loadSession(id: string) {
    if (!isPro) return;
    const res = await fetch(`/api/v1/coach/sessions/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    const stored = storedMessagesFromJson(data.session?.messages);
    setSessionId(id);
    chat.setMessages(storedMessagesToUi(stored));
  }

  async function ensureSession(): Promise<string> {
    const existing = sessions.find((s) => s.id === sessionId);
    if (existing) return sessionId;
    const id = await createSession();
    setSessionId(id);
    return id;
  }

  async function patchSessionMode(id: string, mode: string) {
    await fetch(`/api/v1/coach/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
  }

  async function handleSend(text: string) {
    if (!isPro) {
      setDemoMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text }],
        },
      ]);
      return;
    }

    const id = await ensureSession();

    if (detectMockInterviewIntent(text)) {
      await patchSessionMode(id, "mock_interview");
    }

    await chat.sendMessage({ text }, { body: { sessionId: id } });
  }

  async function handleSaveNote(content: string) {
    if (!isPro || !sessionId) return;
    await fetch("/api/v1/coach/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sessionId }),
    });
  }

  useEffect(() => {
    if (isPro && !loadingSessions && sessions.length === 0) {
      void createSession().then((id) => {
        setSessionId(id);
      });
    }
  }, [isPro, loadingSessions, sessions.length]);

  const showPaywall = !isPro && demoMessages.length >= 3;

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-4rem)] flex-col sm:-mx-6 lg:-mx-8">
      <div className="flex min-h-0 flex-1">
        <CoachSidebar
          sessions={sessions}
          activeId={sessionId}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          onNewChat={() => void handleNewChat()}
          onSelect={(id) => void loadSession(id)}
        />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <CoachChat
            messages={displayMessages}
            userInitial={userInitial}
            coachName={coachName}
            {...(isLoading ? { isLoading: true } : {})}
            {...(isPro ? { onSaveNote: handleSaveNote } : {})}
          />
          {showPaywall && (
            <CoachPaywall
              patternTeaser={initialTeaser.patternTeaser}
              rejectionCount30d={initialTeaser.rejectionCount30d}
            />
          )}
          <CoachInput onSend={(t) => void handleSend(t)} disabled={!isPro && demoMessages.length >= 3} isLoading={isLoading} />
          {isPro && usage && (
            <p className="border-t border-border px-4 py-1 text-center text-[10px] text-muted-foreground">
              {usage.used}/{usage.limit} messages today
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
