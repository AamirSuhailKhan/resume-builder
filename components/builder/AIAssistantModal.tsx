"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { ResumeAI } from "@/lib/api";

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  originalText: string;
  onAccept: (improvedText: string) => void;
  mode: "summary" | "experience";
}

export function AIAssistantModal({
  isOpen,
  onClose,
  title,
  originalText,
  onAccept,
  mode
}: AIAssistantModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [improvedText, setImprovedText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setImprovedText("");
      
      const fetchImprovement = async () => {
        try {
          const result = mode === "summary" 
            ? await ResumeAI.enhanceSummary(originalText)
            : await ResumeAI.enhanceExperience(originalText);
          setImprovedText(result);
        } catch (error) {
          console.error("Failed to enhance text", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchImprovement();
    }
  }, [isOpen, originalText, mode]);

  const handleAccept = () => {
    onAccept(improvedText);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-3xl">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
              <div className="relative h-16 w-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center animate-bounce">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900">AI is working its magic...</h3>
            <p className="text-gray-500 text-sm">Analyzing your content and suggesting professional improvements.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-semibold tracking-wide uppercase text-gray-500">Original</div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 text-sm min-h-[150px] whitespace-pre-wrap">
                  {originalText || <span className="italic text-gray-400">No content provided...</span>}
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                 <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100">
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                 </div>
              </div>
              <div className="space-y-2 relative">
                <div className="text-sm font-semibold tracking-wide uppercase text-primary-600 flex items-center gap-1">
                  <Sparkles className="h-4 w-4" /> Improved
                </div>
                <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-xl text-gray-900 font-medium text-sm min-h-[150px] shadow-inner whitespace-pre-wrap relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-tr-xl pointer-events-none"></div>
                  {improvedText}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={onClose}>Discard</Button>
              <Button onClick={handleAccept} className="gap-2 shadow-sm shadow-primary/20">
                <CheckCircle2 className="h-4 w-4" />
                Accept Suggestion
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
