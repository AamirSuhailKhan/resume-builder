import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-elevated border border-border">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">404 — Page not found</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            This page doesn't exist
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            The page you're looking for has moved, been removed, or never existed.
            Head back home and pick up where you left off.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/demo/ats"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-elevated"
          >
            <ArrowLeft className="h-4 w-4" />
            Try Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
