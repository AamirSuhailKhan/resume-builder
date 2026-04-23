"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Save, Target, Download } from "lucide-react";
import { storage, ResumeData } from "@/lib/storage";
import { ResumeForm } from "@/components/builder/ResumeForm";
import { ResumePreview } from "@/components/builder/ResumePreview";
import { usePDF } from "react-to-pdf";

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("id");

  const [resumeData, setResumeData] = useState<ResumeData | null>(null);

  // ✅ CLEAN PDF SETUP (NO HACKS)
  const { toPDF, targetRef } = usePDF({
    filename: `${resumeData?.title || "Resume"}.pdf`,
    page: { margin: 0, format: "A4" },
  });

  // Load / create resume
  useEffect(() => {
    if (resumeId) {
      const data = storage.getResume(resumeId);
      if (data) setResumeData(data);
      else router.push("/dashboard");
    } else {
      const newResume = storage.createEmptyResume();
      storage.saveResume(newResume);
      router.replace(`/builder?id=${newResume.id}`);
      setResumeData(newResume);
    }
  }, [resumeId, router]);

  // Auto save
  useEffect(() => {
    if (resumeData) {
      const timer = setTimeout(() => {
        storage.saveResume(resumeData);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resumeData]);

  const handleManualSave = () => {
    if (resumeData) {
      storage.saveResume(resumeData);
      alert("Resume saved successfully!");
    }
  };

  if (!resumeData)
    return <div className="p-8 text-center">Loading...</div>;

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
        {/* BUTTONS */}
        <div className="flex-none h-20 flex items-center justify-end px-8 gap-4 z-20 border-b border-gray-200/50 bg-white/50 backdrop-blur-md">
          <Button onClick={() => router.push("/ats")} className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <Target className="mr-2 h-4 w-4 text-indigo-500" /> ATS
          </Button>

          <Button onClick={handleManualSave} className="bg-white border border-gray-200 text-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <Save className="mr-2 h-4 w-4 text-gray-500" /> Save
          </Button>

          <Button onClick={() => toPDF()} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border-0 font-semibold">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>

        {/* PREVIEW (CRITICAL FIX) */}
        <div className="flex-1 overflow-y-auto px-8 pb-12 pt-8 flex justify-center custom-scrollbar">
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