"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, UploadCloud, Award } from "lucide-react";
import ResumeDropZone from "@/components/upload/ResumeDropZone";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { SkipOnboardingButton } from "@/components/onboarding/SkipOnboardingButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { detectCollegeTier } from "@/lib/data/tier1-colleges";

export default function OnboardingResumePage() {
  const router = useRouter();
  const [tier, setTier] = useState<'tier1' | 'tier2' | 'tier3' | null>(null);
  const [collegeName, setCollegeName] = useState<string>("");
  const [resumeId, setResumeId] = useState<string | null>(null);

  const handleUploadSuccess = (result: any) => {
    const institution = result.previewData?.education?.[0]?.institution;
    if (institution) {
      const detectedTier = detectCollegeTier(institution);
      if (detectedTier === 'tier2' || detectedTier === 'tier3') {
        setTier(detectedTier);
        setCollegeName(institution);
        setResumeId(result.resumeId);
        return; // Pause here to show the prompt
      }
    }
    // Default flow
    router.push(`/builder?id=${result.resumeId}`);
  };

  if (tier && resumeId) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center min-h-[50vh] text-center gap-6">
        <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
          <Award className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">Optimize your signals</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          We noticed you're from <strong>{collegeName}</strong>. Many great engineers from non-IIT/NIT colleges miss opportunities due to ATS and recruiter bias.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Would you like us to automatically reformat your resume to lead with your skills and impact?
        </p>
        <div className="flex flex-col w-full gap-3 mt-4">
          <Button 
            size="lg" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
            onClick={() => {
              // Open builder with equalizer open (we can pass a URL param or just open builder and let user click it)
              // Since the Equalizer panel is in the builder, let's just pass `?id=X&equalize=true` to automatically open it if we supported it.
              // For now, redirecting to builder is fine since they just agreed, but actually they want to do it here. 
              // Passing `?id=X&optimize=true` could automatically open the Equalizer panel. Let's just route there.
              router.push(`/builder?id=${resumeId}&optimize=true`);
            }}
          >
            Yes, optimize my resume <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" size="lg" onClick={() => router.push(`/builder?id=${resumeId}`)}>
            Skip for now
          </Button>
        </div>
      </div>
    );
  }

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
          <ResumeDropZone onSuccess={handleUploadSuccess} />
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
