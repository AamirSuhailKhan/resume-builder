"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CoachPaywall({
  patternTeaser,
  rejectionCount30d,
}: {
  patternTeaser: string;
  rejectionCount30d: number;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/60 backdrop-blur-md">
      <div className="mx-4 max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Unlock your personal AI career coach</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Upgrade to Pro to chat with a coach that knows your resume, applications, and rejection patterns.
        </p>
        {rejectionCount30d > 0 && (
          <p className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-medium text-accent">
            {patternTeaser}
          </p>
        )}
        <Link href="/settings" className="mt-6 block">
          <Button className="w-full" size="lg">
            Upgrade to Pro
          </Button>
        </Link>
      </div>
    </div>
  );
}
