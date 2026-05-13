import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "Resume", href: "/onboarding" },
  { number: 2, label: "Preferences", href: "/onboarding/preferences" },
  { number: 3, label: "Matches", href: "/onboarding/matches" },
] as const;

export function OnboardingProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Onboarding progress" className="grid gap-2 sm:grid-cols-3">
      {steps.map((step) => {
        const isComplete = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const className = cn(
          "flex min-h-12 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition",
          isCurrent
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border bg-surface text-muted-foreground",
          isComplete ? "hover:bg-surface-muted hover:text-foreground" : "opacity-80"
        );
        const content = (
          <>
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                isCurrent ? "border-primary bg-primary text-white" : "border-border-strong bg-surface-muted"
              )}
            >
              {isComplete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : step.number}
            </span>
            {step.label}
          </>
        );

        return isComplete ? (
          <Link
            key={step.number}
            href={step.href}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <div key={step.number} className={className} aria-current={isCurrent ? "step" : undefined}>
            {content}
          </div>
        );
      })}
    </nav>
  );
}
