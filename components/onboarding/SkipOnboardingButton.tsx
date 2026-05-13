"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SkipOnboardingButton({ label = "Skip setup" }: { label?: string }) {
  const router = useRouter();
  const [isSkipping, setIsSkipping] = useState(false);

  async function skip() {
    setIsSkipping(true);
    try {
      const response = await fetch("/api/onboarding/skip", { method: "POST" });
      if (!response.ok) throw new Error("Unable to skip onboarding.");
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setIsSkipping(false);
    }
  }

  return (
    <Button type="button" variant="ghost" onClick={skip} isLoading={isSkipping}>
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
