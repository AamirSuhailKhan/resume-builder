"use client";

import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface AnalyzeButtonProps {
  onClick: () => void;
  disabled: boolean;
  step: "idle" | "parsing" | "analyzing" | "computing" | "success";
}

export function AnalyzeButton({ onClick, disabled, step }: AnalyzeButtonProps) {
  const isProcessing = step !== "idle" && step !== "success";

  return (
    <button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={twMerge(
        "flex items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all",
        isProcessing
          ? "bg-indigo-400 shadow-none cursor-not-allowed"
          : step === "success"
          ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
          : "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-200 hover:shadow-indigo-300 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      )}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {step === "parsing" && "Parsing jobs..."}
          {step === "analyzing" && "Analyzing demand..."}
          {step === "computing" && "Computing insights..."}
        </>
      ) : step === "success" ? (
        <>
          <CheckCircle2 className="h-4 w-4" />
          Re-analyze
        </>
      ) : (
        <>
          <Zap className="h-4 w-4" />
          Analyze Market
        </>
      )}
    </button>
  );
}
