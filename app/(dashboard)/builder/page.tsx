"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Save, Download, Sparkles, History, X, AlertTriangle, Loader2 } from "lucide-react";
import { ResumePreview } from "@/components/builder/ResumePreview";
import { usePDF } from "react-to-pdf";
import { detectProfile } from "@/lib/detectProfile";
import {
  useResumeStore,
  selectIsHydrated,
  selectHydrate,
  selectUpsertResume,
  selectCreateResume,
  selectActiveResume,
  selectActiveResumeId,
  selectHasRehydrated,
  selectSetActiveId,
  selectError,
  selectActiveSaveStatus,
} from "@/store/useResumeStore";
import {
  useUIStore,
  selectIsHistoryOpen,
  selectIsGeneratingPDF,
  selectSetIsHistoryOpen,
  selectSetIsGeneratingPDF,
} from "@/store/useUIStore";
import { normalizeResume } from "@/lib/normalizeResume";
import { useSessionUser } from "@/store/useAuthStore";
import { isValidResumeId, safeFetch } from "@/lib/utils/safeFetch";
import { useResumeAutosave } from "@/hooks/useResumeAutosave";

type ResumeApiRecord = {
  id?: string;
  title?: string;
  updated_at?: string;
  data?: Record<string, unknown>;
};

/**
 * LoadingScreen - Centered loader with message.
 */
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-screen flex-col gap-4 bg-white">
      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
      <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">{message}</p>
    </div>
  );
}

/**
 * ErrorScreen - Deterministic error display with recovery options.
 */
function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center h-screen bg-rose-50/20">
      <div className="bg-white rounded-3xl border border-rose-100 shadow-2xl p-10 max-w-md w-full mx-4 text-center animate-in zoom-in-95 duration-300">
        <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Build Error</h2>
        <p className="text-rose-700 text-sm font-mono mb-8 bg-rose-50 p-4 rounded-xl border border-rose-100">{message}</p>
        <div className="flex flex-col gap-3">
          {onRetry && (
            <Button onClick={onRetry} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl">
              Retry Operation
            </Button>
          )}
          <Button onClick={() => window.location.href = "/dashboard"} variant="outline" className="font-bold h-12 rounded-xl border-gray-200">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * BuilderContent - Main editor logic.
 */
function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("id");

  // ── 🔥 FIX 1: HOOK ORDERING (STRICT) ──────────────────────────────────────
  const { user, loading: authLoading } = useSessionUser();

  const isHydrated   = useResumeStore(selectIsHydrated);
  const hasRehydrated = useResumeStore(selectHasRehydrated);
  const hydrate      = useResumeStore(selectHydrate);
  const upsertResume = useResumeStore(selectUpsertResume);
  const createResume = useResumeStore(selectCreateResume);
  const activeResume = useResumeStore(selectActiveResume);
  const activeResumeId = useResumeStore(selectActiveResumeId);
  const setActiveId  = useResumeStore(selectSetActiveId);
  const storeError   = useResumeStore(selectError);
  const saveStatus   = useResumeStore(selectActiveSaveStatus);

  const isHistoryOpen      = useUIStore(selectIsHistoryOpen);
  const isGeneratingPDF    = useUIStore(selectIsGeneratingPDF);
  const setIsHistoryOpen   = useUIStore(selectSetIsHistoryOpen);
  const setIsGeneratingPDF = useUIStore(selectSetIsGeneratingPDF);

  const [initState, setInitState] = useState<"loading" | "ready">("loading");
  const autosave = useResumeAutosave(activeResumeId, {
    enabled: initState === "ready" && isHydrated && isValidResumeId(activeResumeId),
  });

  // ── 🔥 FIX 5: STABLE REALTIME ─────────────────────────────────────────────
  // ── Effects ───────────────────────────────────────────────────────────────

  // 1. One-shot hydration
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!user || !hasRehydrated || hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate();
  }, [user, hasRehydrated, hydrate]);

  // 2. Resume initialization
  const initRef = useRef(false);
  useEffect(() => {
    if (!hasRehydrated || !isHydrated || initRef.current || authLoading || !user) return;
    initRef.current = true;

    const init = async () => {
      const requestedId = isValidResumeId(resumeId) ? resumeId : null;

      if (requestedId) {
        const exists = useResumeStore.getState().resumesById[requestedId];
        if (exists) {
          setActiveId(requestedId);
          setInitState("ready");
          return;
        }

        const fetched = await safeFetch<ResumeApiRecord>(`/api/v1/resumes/${requestedId}`, { retries: 1 });
        if (!fetched.error && fetched.data) {
          const record = fetched.data;
          const data = normalizeResume({
            ...(record.data ?? record),
            id: record.id ?? requestedId,
            title: record.title ?? record.data?.title,
            updatedAt: record.updated_at ?? record.data?.updatedAt,
          });
          upsertResume(data, true);
          setActiveId(data.id);
          setInitState("ready");
          return;
        }
      }

      const newResume = await createResume();
      if (newResume?.id) {
        router.replace(`/builder?id=${newResume.id}`);
        setActiveId(newResume.id);
      }
      setInitState("ready");
    };
    init();
  }, [hasRehydrated, isHydrated, resumeId, authLoading, user, createResume, router, setActiveId, upsertResume]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const resumeData = useMemo(() => activeResume ? normalizeResume(activeResume) : null, [activeResume]);

  const { toPDF, targetRef } = usePDF({
    filename: `${resumeData?.personal?.name || "Resume"}.pdf`,
    page: { margin: 0, format: "A4" },
  });

  const detectedProfile = useMemo(() => resumeData ? detectProfile(resumeData) : null, [resumeData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleManualSave = useCallback(() => {
    if (!resumeData) return;
    void autosave.saveNow();
  }, [autosave, resumeData]);

  const handleImproveResume = useCallback(async () => {
    if (!isValidResumeId(resumeData?.id)) return;
    upsertResume({ ...resumeData, status: "pending" });
    try {
      const res = await safeFetch("/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resumeData.id }),
      });
      if (res.error) throw new Error("Failed to queue analysis");
    } catch {
      upsertResume({ ...resumeData, status: "failed" });
    }
  }, [resumeData, upsertResume]);

  const handleDownloadPDF = useCallback(() => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      try {
        await toPDF();
      } finally {
        setIsGeneratingPDF(false);
      }
    }, 150);
  }, [toPDF, setIsGeneratingPDF]);

  // ── 🔥 FIX 4/7/9: RENDERING GUARDS ────────────────────────────────────────

  if (authLoading || !hasRehydrated || !isHydrated || initState === "loading") {
    return <LoadingScreen message="Initializing Editor..." />;
  }

  if (!user) {
    return <LoadingScreen message="Verifying Session..." />;
  }

  if (storeError) {
    return <ErrorScreen message={storeError} onRetry={() => window.location.reload()} />;
  }

  if (!resumeData) {
    return <ErrorScreen message="Resume not found or failed to load." />;
  }

  const isReady = isValidResumeId(resumeData?.id);
  if (!isReady) {
    return <LoadingScreen message="Preparing Editor..." />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <div className="flex-1 flex flex-col relative">
        
        {/* Version History Overlay */}
        {isHistoryOpen && (
          <div className="absolute inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
            <div className="relative w-80 bg-white shadow-2xl h-full border-l border-gray-200 p-6 animate-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-500" /> History
                </h3>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center font-medium opacity-60">No previous versions found.</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="h-20 border-b border-gray-200/60 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            {detectedProfile && (
              <>
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                  {detectedProfile.level}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 px-3 py-1 rounded-full border border-gray-100">
                  {detectedProfile.domain}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => setIsHistoryOpen(true)} variant="outline" className="font-bold border-gray-200 h-10 px-4 rounded-xl">
              <History className="mr-2 h-4 w-4 text-gray-400" /> History
            </Button>

            <Button
              onClick={handleImproveResume}
              disabled={resumeData.status === "pending" || resumeData.status === "processing"}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-5 rounded-xl shadow-lg transition-all active:scale-95"
            >
              <Sparkles className={`mr-2 h-4 w-4 ${resumeData.status === "processing" ? "animate-spin" : ""}`} />
              {resumeData.status === "pending" ? "Queued" : resumeData.status === "processing" ? "Analyzing" : "AI Fix"}
            </Button>

            <Button onClick={handleManualSave} variant="outline" className="font-bold border-gray-200 h-10 px-4 rounded-xl">
              <Save className="mr-2 h-4 w-4 text-gray-400" /> {saveStatus === "saving" ? "Saving" : saveStatus === "saved" ? "Saved" : "Save"}
            </Button>

            <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 rounded-xl shadow-lg transition-all active:scale-95">
              <Download className={`mr-2 h-4 w-4 ${isGeneratingPDF ? "animate-bounce" : ""}`} />
              {isGeneratingPDF ? "Exporting..." : "PDF"}
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
          <div className="w-full max-w-[794px] shadow-[0_30px_100px_rgba(0,0,0,0.08)] bg-white rounded-sm ring-1 ring-gray-200/50">
            <div ref={targetRef} className="pdf-safe">
              <ResumePreview data={resumeData} renderMode={isGeneratingPDF ? "pdf" : "edit"} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Syncing Editor..." />}>
      <BuilderContent />
    </Suspense>
  );
}
