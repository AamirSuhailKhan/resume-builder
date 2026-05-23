"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  FileSignature, Mail, Sparkles, Wand2, FileText, Check, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { generateApplicationPackage, ApplicationPackageResult } from "@/lib/ai";
import {
  useResumeStore,
  selectResumesById,
  selectResumeIds,
  selectHydrate,
} from "@/store/useResumeStore";
import { normalizeResume } from "@/lib/normalizeResume";

export default function CoverLetterPage() {
  const router = useRouter();

  const resumesById = useResumeStore(selectResumesById);
  const resumeIds   = useResumeStore(selectResumeIds);
  const hydrate = useResumeStore(selectHydrate);

  // Ordered, stable list — no Object.values, recomputes only on add/delete
  const resumes = useMemo(
    () => resumeIds.map((id) => resumesById[id]).filter(Boolean),
    [resumeIds, resumesById]
  );

  const [mounted, setMounted] = useState(false);
  const hydrated = useRef(false);
  useEffect(() => {
    setMounted(true);
    if (!hydrated.current) {
      hydrate();
      hydrated.current = true;
    }
  }, [hydrate]);

  const [selectedId, setSelectedId] = useState("");
  const [job, setJob] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState<ApplicationPackageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"cover" | "email">("cover");

  const resume = useMemo(() => {
    // O(1) dictionary lookup instead of O(n) .find()
    const r = selectedId ? resumesById[selectedId] : undefined;
    return r ? normalizeResume(r) : null;
  }, [resumesById, selectedId]);

  const handleGenerate = useCallback(async () => {
    if (!resume || !job.trim()) return;

    setIsBusy(true);
    setResult(null);
    setErrorMsg("");

    try {
      await new Promise(r => setTimeout(r, 1000));
      const aiResult = await generateApplicationPackage(resume, job);
      setResult(aiResult);
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : "Failed to generate application package.");
    } finally {
      setIsBusy(false);
    }
  }, [resume, job]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <div className="text-sm font-medium text-gray-400">Loading Cover Letter Generator...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-24">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileSignature className="text-blue-500" /> Cover Letter Generator
        </h1>
        <p className="text-gray-500 mt-1">
          Instantly generate a highly tailored cover letter and HR outreach email to maximize your interview chances.
        </p>
      </div>

      {/* EMPTY STATE */}
      {resumes.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4 font-medium">No resumes found. Create one first.</p>
          <Button onClick={() => router.push("/builder")}>Create Resume</Button>
        </div>
      )}

      {/* INPUT */}
      {resumes.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Target Resume</label>
            <select
              className="w-full border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              <option value="">— Choose a resume —</option>
              {resumes.filter((r): r is NonNullable<typeof r> => Boolean(r)).map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
            <textarea
              className="w-full border p-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              rows={6}
              value={job}
              onChange={e => setJob(e.target.value)}
              placeholder="Paste the target job description here..."
            />
          </div>

          {errorMsg && <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-lg">{errorMsg}</p>}

          <Button 
            onClick={handleGenerate} 
            disabled={!resume || !job.trim() || isBusy}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md"
          >
            {isBusy ? (
              <><Wand2 className="mr-2 h-5 w-5 animate-spin" /> Generating Package...</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" /> Generate Cover Letter & Email</>
            )}
          </Button>
        </div>
      )}

      {/* RESULT */}
      {result && !isBusy && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 text-white p-6 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-800">
            <div>
              <h3 className="text-xl font-bold">Application Arsenal</h3>
              <p className="text-slate-400 text-sm mt-1 mb-4">Highly tailored, human-sounding outreach ready to send.</p>
            </div>
            <div className="flex gap-2 mb-4">
              <Button variant={activeTab === "cover" ? "default" : "secondary"} size="sm" onClick={() => setActiveTab("cover")} className={activeTab === "cover" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}>
                <FileSignature className="h-4 w-4 mr-2" /> Cover Letter
              </Button>
              <Button variant={activeTab === "email" ? "default" : "secondary"} size="sm" onClick={() => setActiveTab("email")} className={activeTab === "email" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}>
                <Mail className="h-4 w-4 mr-2" /> HR Email
              </Button>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 relative min-h-[300px]">
            <Button 
              variant="outline" 
              size="sm" 
              className="absolute top-4 right-4 bg-white shadow-sm"
              onClick={() => handleCopy(
                activeTab === "cover" ? result.cover_letter : result.email,
                activeTab
              )}
            >
              {copiedSection === activeTab ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copiedSection === activeTab ? "Copied" : "Copy to Clipboard"}
            </Button>
            
            <div className="whitespace-pre-wrap text-[15px] text-gray-800 leading-relaxed bg-white p-8 rounded-xl border border-gray-200 mt-2 shadow-sm min-h-[250px]">
              {activeTab === "cover" ? result.cover_letter : result.email}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
