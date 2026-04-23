"use client";

import { useEffect, useState } from "react";
import { Target, Search, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage, ResumeData } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { calculateATSScore } from "@/lib/ats";

export default function ATSPage() {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<{ 
    score: number; 
    suggestions: string[]; 
    keywordMatchData: { matched: string[], missing: string[], percentage: number } | null 
  } | null>(null);

  const router = useRouter();

  // ✅ Load resumes safely
  useEffect(() => {
    try {
      const data = storage.getResumes();
      setResumes(data || []);
    } catch (err) {
      console.error("ATS load error:", err);
      setResumes([]);
    }
  }, []);

  const handleScan = () => {
    if (!selectedResumeId) return;
    const resume = resumes.find(r => r.id === selectedResumeId);
    if (!resume) return;

    setIsScanning(true);
    setResult(null);

    // Simulate AI scan delay
    setTimeout(() => {
      const atsResult = calculateATSScore(resume, jobDescription);
      setResult(atsResult as any);
      setIsScanning(false);
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          ATS Resume Scanner
        </h1>
        <p className="text-gray-500 mt-1">
          Simulate how an ATS reads your resume.
        </p>
      </div>

      {/* EMPTY STATE */}
      {resumes.length === 0 && (
        <div className="bg-white p-6 rounded-xl border text-center">
          <p className="text-gray-500 mb-4">
            No resumes found. Create one first.
          </p>
          <Button onClick={() => router.push("/builder")}>
            Create Resume
          </Button>
        </div>
      )}

      {/* SELECT + SCAN */}
      {resumes.length > 0 && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Select a resume
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-gray-50"
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
            >
              <option value="">-- Choose a resume --</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title || "Untitled"} (Updated {new Date(r.updatedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Job Description (Optional)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-gray-50 resize-none"
              rows={4}
              placeholder="Paste job description (optional)"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleScan}
              disabled={!selectedResumeId || isScanning}
              className="px-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <Search className="mr-2 h-4 w-4" />
              {isScanning ? "Scanning..." : "Scan Resume"}
            </Button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {isScanning && (
        <div className="text-center py-16">
          <Target className="h-10 w-10 mx-auto text-primary animate-pulse" />
          <p className="mt-4 text-gray-600 font-medium">Analyzing resume structure and keywords...</p>
        </div>
      )}

      {/* RESULT */}
      {result !== null && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gray-50 p-8 rounded-xl text-center border border-gray-200">
            <div className="text-6xl font-extrabold text-primary mb-1">
              {result.score}<span className="text-2xl text-gray-400 font-bold">/100</span>
            </div>
            <p className="text-gray-700 font-medium mt-3 text-lg">
              {result.score >= 80
                ? "Excellent ATS compatibility! You are well optimized."
                : result.score >= 60
                ? "Good start, but your resume needs improvement."
                : "Needs significant improvement to pass ATS filters."}
            </p>
          </div>

          {/* KEYWORD MATCH ENGINE UI */}
          {jobDescription && result.keywordMatchData && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Keyword Analysis
              </h4>
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="text-5xl font-extrabold text-gray-900">{result.keywordMatchData.percentage}%</div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Match Percentage<br />with Job Description
                </div>
              </div>

              <div className="space-y-6">
                {/* Matched Keywords */}
                <div>
                  <h5 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">
                    Matched ({result.keywordMatchData.matched.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {result.keywordMatchData.matched.length > 0 ? (
                      result.keywordMatchData.matched.map(kw => (
                        <span key={kw} className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-semibold rounded-full border border-green-200 shadow-sm">
                          {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">No keywords matched.</span>
                    )}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div>
                  <h5 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">
                    Missing ({result.keywordMatchData.missing.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {result.keywordMatchData.missing.length > 0 ? (
                      result.keywordMatchData.missing.map(kw => (
                        <span key={kw} className="px-3 py-1.5 bg-red-50 text-red-700 text-sm font-semibold rounded-full border border-red-200 shadow-sm">
                          {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400 italic">No missing keywords!</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" />
              Actionable Suggestions
            </h4>
            {result.suggestions.length > 0 ? (
              <ul className="space-y-4">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No suggestions! Your resume looks perfect.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}