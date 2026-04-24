"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Save, Target, Download, Sparkles, LayoutTemplate, History, X, Clock } from "lucide-react";
import { storage, ResumeData, ResumeVersion } from "@/lib/storage";
import { ResumeForm } from "@/components/builder/ResumeForm";
import { ResumePreview } from "@/components/builder/ResumePreview";
import { usePDF } from "react-to-pdf";
import { improveResume } from "@/lib/ai";

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("id");

  const [resumeData, setResumeData] = useState<any>({
    personal: {
      fullName: "",
      title: "",
      email: "",
      phone: "",
      location: "",
      summary: ""
    },
    experience: [],
    education: "",
    skills: "",
    template: "modern"
  });
  const [isImproving, setIsImproving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);

  // ✅ CLEAN PDF SETUP (NO HACKS)
  const { toPDF, targetRef } = usePDF({
    filename: `${resumeData?.personal?.fullName || resumeData?.name || "Resume"}.pdf`,
    page: { margin: 0, format: "A4" },
  });

  // Load / create resume
  useEffect(() => {
    if (resumeId) {
      const data = storage.getResume(resumeId);
      if (data) {
        setResumeData({
          id: data.id,
          personal: {
            fullName: data?.personal?.fullName || data?.name || "",
            title: data?.personal?.title || data?.title || "",
            email: data?.personal?.email || data?.email || "",
            phone: data?.personal?.phone || data?.phone || "",
            location: data?.personal?.location || data?.location || "",
            summary: data?.personal?.summary || data?.summary || ""
          },
          experience: data?.experience || [],
          education: data?.education || "",
          skills: data?.skills || "",
          template: data?.template || "modern"
        });
      } else router.push("/dashboard");
    } else {
      const newResume = storage.createEmptyResume();
      storage.saveResume(newResume);
      router.replace(`/builder?id=${newResume.id}`);
      setResumeData({
        id: newResume.id,
        personal: {
          fullName: "",
          title: "",
          email: "",
          phone: "",
          location: "",
          summary: ""
        },
        experience: [],
        education: "",
        skills: "",
        template: "modern"
      });
    }
  }, [resumeId, router]);

  // Auto save
  useEffect(() => {
    if (resumeData) {
      const timer = setTimeout(() => {
        storage.saveResume(resumeData);
        storage.saveVersion(resumeData);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resumeData]);

  const handleManualSave = () => {
    if (resumeData) {
      storage.saveResume(resumeData);
      storage.saveVersion(resumeData);
      alert("Resume saved successfully!");
    }
  };

  const handleImproveResume = async () => {
    if (!resumeData) return;
    setIsImproving(true);
    
    try {
      const improved = await improveResume(resumeData);
      console.log("IMPROVED DATA:", improved);
      
      const normalized = {
        ...improved,
        skills: Array.isArray(improved.skills)
          ? improved.skills
          : typeof improved.skills === "string"
          ? (improved.skills as string).split(",").map(s => s.trim())
          : []
      };

      setResumeData(normalized);
      storage.saveResume(normalized);
      storage.saveVersion(normalized);
      alert("AI improved your resume successfully!");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong while improving the resume.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleTemplateChange = (template: "modern" | "minimal" | "professional") => {
    if (!resumeData) return;
    // Cast to any to avoid strict type errors for now since we just added the field
    setResumeData({ ...resumeData, template } as any);
  };

  const handleOpenHistory = () => {
    if (!resumeData) return;
    setVersions(storage.getVersions(resumeData.id));
    setIsHistoryOpen(true);
  };

  const handleRestoreVersion = (versionId: string) => {
    if (!resumeData) return;
    const restored = storage.restoreVersion(resumeData.id, versionId);
    if (restored) {
      setResumeData(restored);
      storage.saveResume(restored);
      alert("Version restored successfully!");
      setIsHistoryOpen(false);
    }
  };

  if (!resumeData?.id)
    return <div className="p-8 text-center">Loading...</div>;

  const currentTemplate = (resumeData as any).template || "modern";

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-white to-gray-50">

      {/* LEFT SIDE */}
      <div className="w-full lg:w-[45%] xl:w-[40%] border-r border-gray-200 z-10 shadow-[0_10px_40px_rgba(0,0,0,0.08)] relative bg-white">
        <ResumeForm
          data={resumeData as any}
          onChange={setResumeData as any}
        />
      </div>

      {/* RIGHT SIDE */}
      <div className="hidden lg:flex flex-1 flex-col bg-transparent relative">
        
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
                <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-800 transition-colors bg-white rounded-full p-1 border border-gray-200 shadow-sm">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 custom-scrollbar">
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center mt-10">No history available yet.</p>
                ) : (
                  versions.map((v, i) => (
                    <div key={v.id} className={`p-4 rounded-xl border ${i === 0 ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 bg-white'} shadow-sm transition-all hover:shadow-md`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${i === 0 ? 'text-indigo-600' : 'text-gray-500'}`}>
                            {i === 0 ? "Latest Version" : `Version ${versions.length - i}`}
                          </div>
                          <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                            <Clock className={`h-3.5 w-3.5 ${i === 0 ? 'text-indigo-400' : 'text-gray-400'}`} />
                            {new Date(v.timestamp).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleRestoreVersion(v.id)} 
                        variant={i === 0 ? "secondary" : "default"}
                        className={`w-full text-xs h-8 mt-2 ${i === 0 ? 'opacity-50 cursor-not-allowed bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
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

        {/* BUTTONS */}
        <div className="flex-none h-20 flex items-center justify-end px-8 gap-4 z-20 border-b border-gray-200/50 bg-white/50 backdrop-blur-md">
          
          <Button onClick={handleOpenHistory} className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <History className="mr-2 h-4 w-4 text-gray-500" /> History
          </Button>

          <Button 
            onClick={handleImproveResume} 
            disabled={isImproving}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-0 font-semibold"
          >
            <Sparkles className={`mr-2 h-4 w-4 ${isImproving ? 'animate-spin' : ''}`} />
            {isImproving ? "Improving..." : "✨ Improve"}
          </Button>

          <Button onClick={() => router.push("/ats")} className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <Target className="mr-2 h-4 w-4 text-indigo-500" /> ATS
          </Button>

          <Button onClick={handleManualSave} className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <Save className="mr-2 h-4 w-4 text-gray-500" /> Save
          </Button>

          <Button onClick={() => toPDF()} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-0 font-semibold">
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>

        {/* TEMPLATE SELECTOR & PREVIEW */}
        <div className="flex-1 overflow-y-auto px-8 pb-12 pt-8 flex flex-col items-center custom-scrollbar">
          
          {/* Template Selector UI */}
          <div className="w-[794px] mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
               <LayoutTemplate className="h-5 w-5 text-indigo-500" />
               Choose Template
             </div>
             <div className="flex gap-2">
               {(["modern", "minimal", "professional"] as const).map(t => (
                 <button
                   key={t}
                   onClick={() => handleTemplateChange(t)}
                   className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 capitalize ${currentTemplate === t ? 'bg-indigo-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                 >
                   {t}
                 </button>
               ))}
             </div>
          </div>

          <div className="shadow-[0_10px_40px_rgba(0,0,0,0.08)] bg-white border border-gray-100 transition-all duration-500 hover:-translate-y-1">
            <div ref={targetRef} className="pdf-safe w-full h-full">
              <ResumePreview data={resumeData as any} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuilderContent />
    </Suspense>
  );
}