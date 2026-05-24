"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CareerOS Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10 border border-danger/20">
          <AlertCircle className="h-10 w-10 text-danger" />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Something went wrong
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Unexpected error
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            We ran into an issue loading this page. This has been logged.
            Try again or head back home.
          </p>
          {process.env.NODE_ENV === "development" && error?.message && (
            <pre className="mt-4 rounded-xl border border-danger/20 bg-danger/5 p-4 text-left text-xs text-danger overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-elevated"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
