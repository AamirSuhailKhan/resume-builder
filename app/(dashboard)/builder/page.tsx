"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Save, Target, Download, Sparkles, LayoutTemplate, History, X, Clock } from "lucide-react";
import { storage, ResumeVersion } from "@/lib/storage";
import { ResumeForm } from "@/components/builder/ResumeForm";
import { ResumePreview } from "@/components/builder/ResumePreview";
import { usePDF } from "react-to-pdf";
import { improveResume } from "@/lib/ai";
import { detectProfile } from "@/lib/detectProfile";
import {
  useResumeStore,
  selectIsHydrated,
  selectHydrate,
  selectUpsertResume,
  selectCreateResume,
  selectResumes,
  selectSetActiveId,
} from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("id");

  // ── Fine-grained selectors — only re-renders when the specific slice changes
  const isHydrated    = useResumeStore(selectIsHydrated);
  const hydrate       = useResumeStore(selectHydrate);
  const upsertResume  = useResumeStore(selectUpsertResume);
  const createResume  = useResumeStore(selectCreateResume);
  const resumes       = useResumeStore(selectResumes);
  const setActiveId   = useResumeStore(selectSetActiveId);

  // Local UI state — does NOT affect store
  const [isImproving, setIsImproving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);

  // ── ONE-SHOT hydration via ref guard ─────────────────────────────────────
  // This is the critical fix: [] dep array + ref guard = runs exactly once.
  // Previously: [isHydrated, hydrate] caused re-fires every time state changed.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ONE-SHOT resume init via ref guard ────────────────────────────────────
  // Critical fix: previously ran on [resumes, resumeId] which looped:
  //   hydrate() → resumes changes → effect fires → createResume() → resumes changes → loop
  const initRef = useRef(false);
  useEffect(() => {
    if (!isHydrated || initRef.current) return;
    initRef.current = true;

    if (resumeId) {
      // Check if resume exists; if not, redirect
      const exists = useResumeStore.getState().resumes.find((r) => r.id === resumeId);
      if (!exists) {
        router.push("/dashboard");
      } else {
        // ✅ CRITICAL: Set activeResumeId so updateField knows which resume to mutate
        setActiveId(resumeId);
      }
    } else {
      // No ID in URL → create a new resume and navigate to it
      const newResume = createResume();
      setActiveId(newResume.id);
      router.replace(`/builder?id=${newResume.id}`);
    }
  }, [isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derive active resume (memoized) ───────────────────────────────────────
  const resumeData = useMemo(() => {
    const found = resumes.find((r) => r.id === resumeId);
    return found ? normalizeResume(found) : null;
  }, [resumes, resumeId]);

  // PDF setup — filename updates when name changes but ref is stable
  const { toPDF, targetRef } = usePDF({
    filename: `${resumeData?.personal?.name || "Resume"}.pdf`,
    page: { margin: 0, format: "A4" },
  });

  // Detected profile — recalculated whenever resume changes
  const detectedProfile = useMemo(() => {
    if (!resumeData) return null;
    return detectProfile(resumeData);
  }, [resumeData]);

  // ── Stable handlers (useCallback with stable deps) ────────────────────────

  // ResumeForm onChange — passes new data directly to store
  const handleChange = useCallback(
    (updated: any) => {
      upsertResume(updated);
    },
    [upsertResume]
  );

  const handleManualSave = useCallback(() => {
    if (!resumeData) return;
    upsertResume(resumeData);
    alert("Resume saved successfully!");
  }, [resumeData, upsertResume]);

  const handleImproveResume = useCallback(async () => {
    if (!resumeData) return;
    setIsImproving(true);
    try {
      const improved = await improveResume(resumeData);
      upsertResume(improved);
      alert("AI improved your resume successfully!");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong while improving the resume.");
    } finally {
      setIsImproving(false);
    }
  }, [resumeData, upsertResume]);

  const handleTemplateChange = useCallback(
    (template: "modern" | "minimal" | "professional") => {
      if (!resumeData) return;
      upsertResume({ ...resumeData, template });
    },
    [resumeData, upsertResume]
  );

  const handleOpenHistory = useCallback(() => {
    if (!resumeData) return;
    setVersions(storage.getVersions(resumeData.id));
    setIsHistoryOpen(true);
  }, [resumeData]);

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      if (!resumeData) return;
      const restored = storage.restoreVersion(resumeData.id, versionId);
      if (restored) {
        upsertResume(restored);
        alert("Version restored successfully!");
        setIsHistoryOpen(false);
      }
    },
    [resumeData, upsertResume]
  );

  const handleDownloadPDF = useCallback(() => {
    setIsGeneratingPDF(true);
    // Allow React to re-render with isEditing=false before capturing DOM
    setTimeout(async () => {
      try {
        await toPDF();
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 150);
  }, [toPDF]);

  // ── Guard: don't render until hydrated and resume exists ─────────────────
  if (!isHydrated || !resumeData?.id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400 text-sm">Loading resume...</div>
      </div>
    );
  }

  const currentTemplate = resumeData.template || "modern";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">

      {/* CANVAS (FULL WIDTH) */}
      <div className="flex-1 flex flex-col relative">

        {/* HISTORY PANEL OVERLAY */}
        {isHistoryOpen && (
          <>
            <div
              className="absolute inset-0 bg-black/5 z-30"
              onClick={() => setIsHistoryOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right-8 duration-300">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-500" /> Version History
                </h3>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-gray-400 hover:text-gray-800 transition-colors bg-white rounded-full p-1 border border-gray-200 shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 custom-scrollbar">
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center mt-10">No history available yet.</p>
                ) : (
                  versions.map((v, i) => (
                    <div
                      key={v.id}
                      className={`p-4 rounded-xl border ${i === 0 ? "border-indigo-200 bg-indigo-50/50" : "border-gray-200 bg-white"} shadow-sm transition-all hover:shadow-md`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${i === 0 ? "text-indigo-600" : "text-gray-500"}`}>
                            {i === 0 ? "Latest Version" : `Version ${versions.length - i}`}
                          </div>
                          <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                            <Clock className={`h-3.5 w-3.5 ${i === 0 ? "text-indigo-400" : "text-gray-400"}`} />
                            {new Date(v.timestamp).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRestoreVersion(v.id)}
                        variant={i === 0 ? "secondary" : "default"}
                        className={`w-full text-xs h-8 mt-2 ${i === 0 ? "opacity-50 cursor-not-allowed bg-indigo-100 text-indigo-700 hover:bg-indigo-100" : "bg-gray-900 text-white hover:bg-gray-800"}`}
                        disabled={i === 0}
                      >
                        {i === 0 ? "Current" : "Restore this version"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* TOOLBAR */}
        <div className="flex-none h-20 flex items-center justify-between px-8 gap-4 z-20 border-b border-gray-200/50 bg-white/50 backdrop-blur-md">
          {/* Profile Badge */}
          {detectedProfile && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    detectedProfile.level === 'Fresher' ? 'bg-green-100 text-green-700' :
                    detectedProfile.level === 'Senior' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {detectedProfile.level}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    detectedProfile.domain === 'Tech' ? 'bg-indigo-100 text-indigo-700' :
                    detectedProfile.domain === 'Non-Tech' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {detectedProfile.domain}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">{detectedProfile.tagline}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 ml-auto">
          <Button
            onClick={handleOpenHistory}
            className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <History className="mr-2 h-4 w-4 text-gray-500" /> History
          </Button>

          <Button
            onClick={handleImproveResume}
            disabled={isImproving}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-0 font-semibold"
          >
            <Sparkles className={`mr-2 h-4 w-4 ${isImproving ? "animate-spin" : ""}`} />
            {isImproving ? "Improving..." : "✨ Improve"}
          </Button>

          <Button
            onClick={() => router.push("/ats")}
            className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <Target className="mr-2 h-4 w-4 text-indigo-500" /> ATS
          </Button>

          <Button
            onClick={handleManualSave}
            className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          >
            <Save className="mr-2 h-4 w-4 text-gray-500" /> Save
          </Button>

          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-0 font-semibold"
          >
            <Download className={`mr-2 h-4 w-4 ${isGeneratingPDF ? "animate-bounce" : ""}`} /> 
            {isGeneratingPDF ? "Generating..." : "PDF"}
          </Button>
          </div>
        </div>

        {/* TEMPLATE SELECTOR & PREVIEW */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-12 pt-8 flex flex-col items-center custom-scrollbar">
          <div className="w-full max-w-[794px] mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <LayoutTemplate className="h-5 w-5 text-indigo-500" />
              Choose Template
            </div>
            <div className="flex gap-2">
              {(["modern", "minimal", "professional"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTemplateChange(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 capitalize ${
                    currentTemplate === t
                      ? "bg-indigo-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={`shadow-2xl bg-white transition-all duration-500 ${isGeneratingPDF ? 'scale-[1] ring-4 ring-indigo-500 ring-offset-4' : 'hover:-translate-y-1'}`}>
            <div ref={targetRef} className="pdf-safe w-[794px]">
              <ResumePreview data={resumeData as any} isEditing={!isGeneratingPDF} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading builder...</div>}>
      <BuilderContent />
    </Suspense>
  );
}