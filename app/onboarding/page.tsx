import Link from "next/link";
import { ArrowRight, UploadCloud } from "lucide-react";
import ResumeDropZone from "@/components/upload/ResumeDropZone";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SkipOnboardingButton } from "@/components/onboarding/SkipOnboardingButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingResumePage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <OnboardingProgress currentStep={1} />

      <div className="grid gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-surface-muted">
          <UploadCloud className="h-5 w-5 text-accent" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">Start with your resume</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Uploading a resume lets the matcher compare roles against your actual experience. You can continue without
          one and add it later from the builder.
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Upload PDF resume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResumeDropZone />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkipOnboardingButton />
        <Link href="/onboarding/preferences">
          <Button size="lg">
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
