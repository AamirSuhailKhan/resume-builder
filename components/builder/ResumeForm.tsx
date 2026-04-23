"use client";

import { useState } from "react";
import { ResumeData, Experience } from "@/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs } from "@/components/ui/tabs";
import { Sparkles, Trash2, Plus } from "lucide-react";
import { AIAssistantModal } from "./AIAssistantModal";

interface ResumeFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

export function ResumeForm({ data, onChange }: ResumeFormProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [aiModalConfig, setAiModalConfig] = useState<{
    isOpen: boolean;
    mode: "summary" | "experience";
    originalText: string;
    targetId?: string;
  }>({
    isOpen: false,
    mode: "summary",
    originalText: ""
  });

  const handleChange = (field: keyof ResumeData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleExperienceChange = (id: string, field: keyof Experience, value: string) => {
    const updatedExperience = data.experience.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    handleChange("experience", updatedExperience);
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      points: ""
    };
    handleChange("experience", [...data.experience, newExp]);
  };

  const removeExperience = (id: string) => {
    handleChange("experience", data.experience.filter(exp => exp.id !== id));
  };

  const handleAcceptAI = (improvedText: string) => {
    if (aiModalConfig.mode === "summary") {
      handleChange("summary", improvedText);
    } else if (aiModalConfig.mode === "experience" && aiModalConfig.targetId) {
      handleExperienceChange(aiModalConfig.targetId, "points", improvedText);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-none p-6 border-b border-gray-100 bg-white">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Resume</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in your details below.</p>
        
        <div className="mt-6">
          <Tabs
            tabs={[
              { id: "personal", label: "Personal" },
              { id: "experience", label: "Experience" },
              { id: "education", label: "Education" },
              { id: "skills", label: "Skills" },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="w-full bg-gray-50/80 p-1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {activeTab === "personal" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input value={data.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="e.g. Jane Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Professional Title</label>
                <Input value={data.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="e.g. Senior Software Engineer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" value={data.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="jane@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input value={data.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Location</label>
              <Input value={data.location} onChange={(e) => handleChange("location", e.target.value)} placeholder="e.g. San Francisco, CA" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Summary</label>
              <div className="relative group">
                <Textarea 
                  value={data.summary} 
                  onChange={(e) => handleChange("summary", e.target.value)} 
                  placeholder="Briefly describe your professional background..." 
                  className="min-h-[120px] pb-10"
                />
                <Button 
                  onClick={() => setAiModalConfig({ isOpen: true, mode: "summary", originalText: data.summary })}
                  variant="ghost" 
                  size="sm" 
                  className="absolute bottom-2 right-2 text-primary hover:text-primary hover:bg-primary-50 gap-1 h-7 px-2 text-xs transition-opacity"
                >
                  <Sparkles className="h-3 w-3" />
                  Improve Summary
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "experience" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {data.experience.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm relative group">
                <div className="absolute right-2 top-2">
                  <Button variant="ghost" size="icon" onClick={() => removeExperience(exp.id)} className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Job Title</label>
                      <Input value={exp.role} onChange={(e) => handleExperienceChange(exp.id, "role", e.target.value)} placeholder="e.g. Senior Developer" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Company</label>
                      <Input value={exp.company} onChange={(e) => handleExperienceChange(exp.id, "company", e.target.value)} placeholder="e.g. TechCorp Inc." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Start Date</label>
                      <Input type="month" value={exp.startDate} onChange={(e) => handleExperienceChange(exp.id, "startDate", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">End Date</label>
                      <Input type="month" value={exp.endDate} onChange={(e) => handleExperienceChange(exp.id, "endDate", e.target.value)} placeholder="Present" />
                    </div>
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <Textarea 
                      value={exp.points} 
                      onChange={(e) => handleExperienceChange(exp.id, "points", e.target.value)}
                      className="min-h-[100px] pb-10"
                      placeholder="• Led the frontend team...&#10;• Implemented design system..."
                    />
                    <Button 
                      onClick={() => setAiModalConfig({ isOpen: true, mode: "experience", originalText: exp.points, targetId: exp.id })}
                      variant="ghost" 
                      size="sm" 
                      className="absolute bottom-2 right-2 text-primary hover:text-primary hover:bg-primary-50 gap-1 h-7 px-2 text-xs"
                    >
                      <Sparkles className="h-3 w-3" />
                      Enhance Bullets
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addExperience} variant="outline" className="w-full border-dashed gap-2">
              <Plus className="h-4 w-4" /> Add Experience
            </Button>
          </div>
        )}

        {activeTab === "education" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Education Details</label>
              <Textarea 
                value={data.education} 
                onChange={(e) => handleChange("education", e.target.value)} 
                placeholder="Bachelor of Science in Computer Science&#10;University of Technology, San Francisco, CA (2014 - 2018)" 
                className="min-h-[150px]"
              />
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Skills Details</label>
              <Textarea 
                value={data.skills} 
                onChange={(e) => handleChange("skills", e.target.value)} 
                placeholder="Frameworks: React, Next.js, Tailwind CSS&#10;Languages: JavaScript, TypeScript" 
                className="min-h-[150px]"
              />
            </div>
          </div>
        )}
      </div>

      <AIAssistantModal 
        isOpen={aiModalConfig.isOpen}
        onClose={() => setAiModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={aiModalConfig.mode === "summary" ? "Improve Professional Summary" : "Enhance Experience Bullets"}
        originalText={aiModalConfig.originalText}
        mode={aiModalConfig.mode}
        onAccept={handleAcceptAI}
      />
    </div>
  );
}
