"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const moods = [
  { value: 1, label: "😞" },
  { value: 2, label: "😕" },
  { value: 3, label: "😐" },
  { value: 4, label: "😊" },
  { value: 5, label: "🎉" },
];

type Milestone = { id: string; type: string; celebrated: boolean };

export function WellbeingWidget() {
  const [dismissed, setDismissed] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    fetch("/api/v1/wellbeing/milestones")
      .then((response) => response.json())
      .then((payload) => {
        const fresh = (payload.newlyAwarded as Milestone[] | undefined)?.[0];
        if (fresh) setMilestone(fresh);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMinimized(true), 10_000);
    return () => clearTimeout(timer);
  }, [message]);

  if (dismissed) return null;
  if (minimized) {
    return (
      <div className="fixed bottom-5 right-5 z-30 rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm text-muted-foreground shadow-lg">
        <CheckCircle2 className="mr-2 inline h-4 w-4 text-success" />
        Checked in this week
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-border bg-surface-elevated p-4 shadow-2xl">
      {milestone && (
        <div className="relative mb-3 overflow-hidden rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <Confetti />
          <p className="font-semibold">{milestone.type.replaceAll("_", " ")} unlocked</p>
          <p className="mt-1 text-success/80">That progress counts. Keep the next step small and clear.</p>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">How's your search going this week?</p>
        </div>
        <button aria-label="Dismiss wellbeing check-in" onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {message ? (
        <div className="rounded-lg border border-border bg-surface p-3 text-sm leading-6 text-muted-foreground">{message}</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {moods.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMood(item.value)}
                className={mood === item.value ? "h-10 rounded-lg border border-accent bg-accent/10 text-lg" : "h-10 rounded-lg border border-border bg-surface text-lg"}
              >
                {item.label}
              </button>
            ))}
          </div>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything specific on your mind?" className="min-h-20 w-full resize-none rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-accent" />
          <Button
            size="sm"
            disabled={!mood}
            onClick={async () => {
              const response = await fetch("/api/v1/wellbeing/checkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood, note }),
              });
              const payload = await response.json();
              setMessage(payload.message ?? "Checked in. Be kind to yourself this week.");
            }}
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}

function Confetti() {
  return (
    <>
      <style>{`
        @keyframes wellbeing-fall { from { transform: translateY(-12px); opacity: 1; } to { transform: translateY(80px); opacity: 0; } }
        .wellbeing-confetti span { animation: wellbeing-fall 1.8s linear infinite; }
      `}</style>
      <div className="wellbeing-confetti pointer-events-none absolute inset-0">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <span key={item} className="absolute top-0 h-2 w-2 rounded-full bg-accent" style={{ left: `${12 + item * 14}%`, animationDelay: `${item * 0.16}s` }} />
        ))}
      </div>
    </>
  );
}
