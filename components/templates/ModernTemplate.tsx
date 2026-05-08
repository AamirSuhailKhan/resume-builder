"use client";

import React, { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { EditableText } from "@/components/builder/inline/EditableText";
import { ExperienceArray } from "@/components/builder/inline/ExperienceArray";
import {
  useResumeStore,
  selectUpdateField,
  selectActiveResume,
} from "@/store/useResumeStore";
import { RenderMode } from "@/components/builder/ResumePreview";
import { ResumeData } from "@/lib/storage";

const RichEditor = dynamic(
  () => import("@/components/builder/inline/RichEditor").then((mod) => mod.RichEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-20 bg-gray-50 animate-pulse rounded-md w-full my-2 border border-gray-100" />
    ),
  }
);

interface ModernTemplateProps {
  data: ResumeData;
  renderMode?: RenderMode;
  isEditing?: boolean; // legacy fallback
}

type ModernPersonal = ResumeData["personal"] & { fullName?: string; title?: string };
type ModernResume = ResumeData & { personal: ModernPersonal };
type ModernExperienceItem = ResumeData["experience"][number] & { description?: string };
type ModernEducationItem = ResumeData["education"][number] & { endDate?: string };
type TextHandler = (value: string) => void;
type ExperienceHandlers = {
  onRole: TextHandler;
  onCompany: TextHandler;
  onStartDate: TextHandler;
  onEndDate: TextHandler;
  onPoints: TextHandler;
};

// ─── Header Section (Memoized) ───────────────────────────────────────────────
const ModernHeader = React.memo(function ModernHeader({ 
  name, title, email, phone, location, isEditing, 
  onName, onTitle, onEmail, onPhone, onLocation 
}: {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  isEditing: boolean;
  onName: TextHandler;
  onTitle: TextHandler;
  onEmail: TextHandler;
  onPhone: TextHandler;
  onLocation: TextHandler;
}) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 group/header relative">
      {isEditing && (
        <div className="absolute top-2 right-2 text-xs font-bold bg-white/20 px-2 py-1 rounded text-white/80 opacity-0 group-hover/header:opacity-100 transition-opacity">
          ✏️ Click any field to edit
        </div>
      )}

      <h1 className="text-4xl font-black text-white tracking-tight">
        <EditableText value={name} onChange={onName} placeholder="Your Full Name" isEditing={isEditing} className="text-white" />
      </h1>

      <div className="text-xl text-indigo-100 mt-2 font-medium">
        <EditableText value={title} onChange={onTitle} placeholder="Professional Title" isEditing={isEditing} className="text-indigo-100" />
      </div>

      <div className="flex flex-wrap gap-3 mt-5 text-sm font-medium opacity-90 items-center">
        <EditableText value={email} onChange={onEmail} placeholder="Email" isEditing={isEditing} className="text-white/90" />
        <span className="opacity-60">•</span>
        <EditableText value={phone} onChange={onPhone} placeholder="Phone" isEditing={isEditing} className="text-white/90" />
        <span className="opacity-60">•</span>
        <EditableText value={location} onChange={onLocation} placeholder="City, Country" isEditing={isEditing} className="text-white/90" />
      </div>
    </div>
  );
});

// ─── Summary Section (Memoized) ──────────────────────────────────────────────
const ModernSummary = React.memo(function ModernSummary({ summary, isEditing, onSummary }: {
  summary: string;
  isEditing: boolean;
  onSummary: TextHandler;
}) {
  return (
    <section className="relative group/section">
      {isEditing && (
        <div className="absolute -left-6 top-1 text-xs opacity-0 group-hover/section:opacity-100 text-gray-400 rotate-[-90deg] origin-left print:hidden select-none">
          Summary
        </div>
      )}
      <h2 className="text-indigo-600 font-black uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-4 text-sm">
        Professional Summary
      </h2>
      <RichEditor
        value={summary}
        onChange={onSummary}
        placeholder="Write a compelling professional summary..."
        isEditing={isEditing}
        sectionType="summary"
        className="text-gray-800 leading-relaxed text-base"
      />
    </section>
  );
});

// ─── Experience Section (Memoized) ───────────────────────────────────────────
const ModernExperience = React.memo(function ModernExperience({ experience, expHandlers, isEditing }: {
  experience: ModernExperienceItem[];
  expHandlers: ExperienceHandlers[];
  isEditing: boolean;
}) {
  return (
    <section className="relative group/section">
      {isEditing && (
        <div className="absolute -left-6 top-1 text-xs opacity-0 group-hover/section:opacity-100 text-gray-400 rotate-[-90deg] origin-left print:hidden select-none">
          Experience
        </div>
      )}
      <h2 className="text-indigo-600 font-black uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-6 text-sm">
        Experience
      </h2>
      <ExperienceArray
        items={experience}
        isEditing={isEditing}
        renderItem={(exp, index: number) => {
          const handlers = expHandlers[index];
          if (!handlers) return null;
          return (
            <div>
              <div className="flex justify-between items-start mb-1 gap-4">
                <h4 className="font-black text-xl text-gray-900 flex-1">
                  <EditableText value={exp.role ?? ""} onChange={handlers.onRole} placeholder="Job Title" isEditing={isEditing} />
                </h4>
                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full shrink-0 flex items-center gap-1">
                  <EditableText value={exp.startDate ?? ""} onChange={handlers.onStartDate} placeholder="Start" isEditing={isEditing} />
                  <span>–</span>
                  <EditableText value={exp.endDate ?? ""} onChange={handlers.onEndDate} placeholder="Present" isEditing={isEditing} />
                </span>
              </div>
              <p className="text-base text-gray-600 font-bold mb-3">
                <EditableText value={exp.company ?? ""} onChange={handlers.onCompany} placeholder="Company Name" isEditing={isEditing} />
              </p>
              <div className="text-gray-700 leading-relaxed text-sm">
                <RichEditor
                  value={exp.points ?? exp.description ?? ""}
                  onChange={handlers.onPoints}
                  placeholder="• Describe your responsibilities and impact..."
                  isEditing={isEditing}
                  sectionType="experience_bullet"
                />
              </div>
            </div>
          );
        }}
      />
    </section>
  );
});

// ─── Skills Section (Memoized) ───────────────────────────────────────────────
const ModernSkills = React.memo(function ModernSkills({ skills, isEditing }: {
  skills: string[];
  isEditing: boolean;
}) {
  return (
    <section>
      <h2 className="text-indigo-600 font-black uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-4 text-sm">
        Skills
      </h2>
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((s: string, i: number) => (
            <span key={i} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
              {s.trim()}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 italic text-sm">
          {isEditing ? "Add skills via the form panel" : "No skills listed"}
        </p>
      )}
    </section>
  );
});

// ─── Education Section (Memoized) ────────────────────────────────────────────
const ModernEducation = React.memo(function ModernEducation({ education, isEditing }: {
  education: ModernEducationItem[];
  isEditing: boolean;
}) {
  return (
    <section>
      <h2 className="text-indigo-600 font-black uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-4 text-sm">
        Education
      </h2>
      {education.length > 0 ? (
        <div className="space-y-3">
          {education.map((edu, i: number) => (
            <div key={edu.id ?? i}>
              <div className="flex justify-between items-baseline">
                <p className="font-bold text-gray-900">{edu.degree || "Degree"}</p>
                <span className="text-sm text-gray-500">{edu.year || edu.endDate || ""}</span>
              </div>
              <p className="text-gray-600 text-sm">{edu.school || "Institution"}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 italic text-sm">
          {isEditing ? "Add education via the form panel" : "No education listed"}
        </p>
      )}
    </section>
  );
});

// ─── Main Template Component ─────────────────────────────────────────────────
export function ModernTemplate({ data, renderMode = "edit", isEditing: fallbackIsEditing }: ModernTemplateProps) {
  const updateField = useResumeStore(selectUpdateField);
  const activeResume = useResumeStore(selectActiveResume);
  
  const isEditing = renderMode === "edit" || fallbackIsEditing === true;

  // Use active resume from store if editing, otherwise fallback to prop data
  const src = ((isEditing && activeResume) ? activeResume : data) as ModernResume;

  const name     = src?.personal?.fullName || src?.personal?.name || "";
  const title    = src?.personal?.title || "";
  const email    = src?.personal?.email || "";
  const phone    = src?.personal?.phone || "";
  const location = src?.personal?.location || "";
  const summary  = src?.personal?.summary || "";
  const experience: ModernExperienceItem[] = src?.experience ?? [];
  const skills: string[]  = Array.isArray(src?.skills) ? src.skills : [];
  const education: ModernEducationItem[]  = Array.isArray(src?.education) ? src.education : [];

  // Stable top-level handlers
  const onName     = useCallback((v: string) => updateField("personal.name", v), [updateField]);
  const onTitle    = useCallback((v: string) => updateField("personal.title", v), [updateField]);
  const onEmail    = useCallback((v: string) => updateField("personal.email", v), [updateField]);
  const onPhone    = useCallback((v: string) => updateField("personal.phone", v), [updateField]);
  const onLocation = useCallback((v: string) => updateField("personal.location", v), [updateField]);
  const onSummary  = useCallback((v: string) => updateField("personal.summary", v), [updateField]);

  const expHandlers = useMemo(
    () =>
      experience.map((_, idx) => ({
        onRole:      (v: string) => updateField(`experience.${idx}.role`, v),
        onCompany:   (v: string) => updateField(`experience.${idx}.company`, v),
        onStartDate: (v: string) => updateField(`experience.${idx}.startDate`, v),
        onEndDate:   (v: string) => updateField(`experience.${idx}.endDate`, v),
        onPoints:    (v: string) => updateField(`experience.${idx}.points`, v),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [experience.length, updateField]
  );

  return (
    <div className={`font-sans bg-white min-h-[1123px] flex flex-col ${isEditing ? "is-editing" : ""}`}>
      <ModernHeader 
        name={name} title={title} email={email} phone={phone} location={location}
        isEditing={isEditing}
        onName={onName} onTitle={onTitle} onEmail={onEmail} onPhone={onPhone} onLocation={onLocation}
      />
      <div className="p-8 space-y-8 flex-1">
        <ModernSummary summary={summary} isEditing={isEditing} onSummary={onSummary} />
        <ModernExperience experience={experience} expHandlers={expHandlers} isEditing={isEditing} />
        <ModernSkills skills={skills} isEditing={isEditing} />
        <ModernEducation education={education} isEditing={isEditing} />
      </div>
    </div>
  );
}
