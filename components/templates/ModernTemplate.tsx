"use client";
import React from "react";
import { EditableText } from "@/components/builder/inline/EditableText";
import dynamic from "next/dynamic";
import { ExperienceArray } from "@/components/builder/inline/ExperienceArray";
import { useResumeStore, selectUpdateField } from "@/store/useResumeStore";

const RichEditor = dynamic(
  () => import("@/components/builder/inline/RichEditor").then((mod) => mod.RichEditor),
  { ssr: false, loading: () => <div className="h-20 bg-gray-50 animate-pulse rounded-md w-full my-2 border border-gray-100" /> }
);

export function ModernTemplate({ data, isEditing = true }: { data: any, isEditing?: boolean }) {
  const updateField = useResumeStore(selectUpdateField);
  
  // Safe handler factory for nested updates
  const handleUpdate = (path: string) => (value: string) => {
    updateField(path, value);
  };

  const name = data?.personal?.fullName || data?.personal?.name || data?.name || "";
  const title = data?.personal?.title || data?.title || "";
  const email = data?.personal?.email || data?.email || "";
  const phone = data?.personal?.phone || data?.phone || "";
  const location = data?.personal?.location || data?.location || "";
  const summary = data?.personal?.summary || data?.summary || "";
  const experience = data?.experience || [];
  const skills = Array.isArray(data?.skills) ? data.skills.join(", ") : data?.skills;
  const education = Array.isArray(data?.education) 
    ? data.education.map((e: any) => `${e.degree || ''} ${e.school || ''}`).join("\n")
    : data?.education;

  return (
    <div className={`font-sans bg-white min-h-[1123px] flex flex-col ${isEditing ? 'is-editing' : ''}`}>
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 group/header relative">
        {isEditing && <div className="absolute top-2 right-2 text-xs font-bold bg-white/20 px-2 py-1 rounded text-white/80 opacity-0 group-hover/header:opacity-100 transition-opacity">Header</div>}
        
        <h1 className="text-4xl font-black text-white tracking-tight">
          <EditableText 
            value={name} 
            onChange={handleUpdate("personal.name")} 
            placeholder="Your Full Name" 
            isEditing={isEditing} 
            className="text-white hover:bg-white/10 focus:bg-white/20 focus:ring-white/30"
          />
        </h1>
        
        <div className="text-xl text-indigo-100 mt-2 font-medium">
          <EditableText 
            value={title} 
            onChange={handleUpdate("personal.title")} 
            placeholder="Professional Title" 
            isEditing={isEditing} 
            className="text-indigo-100 hover:bg-white/10 focus:bg-white/20 focus:ring-white/30"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 mt-5 text-sm font-medium opacity-90 items-center">
          <EditableText 
            value={email} 
            onChange={handleUpdate("personal.email")} 
            placeholder="Email Address" 
            isEditing={isEditing} 
            className="hover:bg-white/10 focus:bg-white/20 focus:ring-white/30 px-1 -ml-1"
          />
          <span>•</span>
          <EditableText 
            value={phone} 
            onChange={handleUpdate("personal.phone")} 
            placeholder="Phone Number" 
            isEditing={isEditing} 
            className="hover:bg-white/10 focus:bg-white/20 focus:ring-white/30 px-1"
          />
          <span>•</span>
          <EditableText 
            value={location} 
            onChange={handleUpdate("personal.location")} 
            placeholder="Location (City, State)" 
            isEditing={isEditing} 
            className="hover:bg-white/10 focus:bg-white/20 focus:ring-white/30 px-1"
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8 space-y-8 flex-1">
        <section className="relative group/section">
          {isEditing && <div className="absolute -left-6 top-1 text-xs opacity-0 group-hover/section:opacity-100 text-gray-400 rotate-[-90deg] origin-left print:hidden">Summary</div>}
          <h2 className="text-indigo-600 font-black uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-4 text-sm">Professional Summary</h2>
          <RichEditor 
            value={summary}
            onChange={handleUpdate("personal.summary")}
            placeholder="Write a compelling professional summary highlighting your key achievements..."
            isEditing={isEditing}
            sectionType="summary"
            className="text-gray-800 leading-relaxed text-base"
          />
        </section>

        <section className="relative group/section">
          {isEditing && <div className="absolute -left-6 top-1 text-xs opacity-0 group-hover/section:opacity-100 text-gray-400 rotate-[-90deg] origin-left print:hidden">Experience</div>}
          <h2 className="text-indigo-600 font-black uppercase tracking-widest border-b-2 border-indigo-100 pb-2 mb-6 text-sm">Experience</h2>
          
          <ExperienceArray 
            items={experience}
            isEditing={isEditing}
            renderItem={(exp, index) => (
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-black text-xl text-gray-900">
                    <EditableText 
                      value={exp.role} 
                      onChange={handleUpdate(`experience.${index}.role`)} 
                      placeholder="Job Title" 
                      isEditing={isEditing} 
                    />
                  </h4>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full shrink-0 flex items-center gap-1">
                    <EditableText value={exp.startDate} onChange={handleUpdate(`experience.${index}.startDate`)} placeholder="Start" isEditing={isEditing} />
                    <span>-</span>
                    <EditableText value={exp.endDate} onChange={handleUpdate(`experience.${index}.endDate`)} placeholder="Present" isEditing={isEditing} />
                  </span>
                </div>
                <p className="text-base text-gray-600 font-bold mb-3">
                  <EditableText 
                    value={exp.company} 
                    onChange={handleUpdate(`experience.${index}.company`)} 
                    placeholder="Company Name" 
                    isEditing={isEditing} 
                  />
                </p>
                <div className="text-gray-700 leading-relaxed text-sm">
                  <RichEditor 
                    value={exp.points || exp.description || ""}
                    onChange={handleUpdate(`experience.${index}.points`)}
                    placeholder="• Describe your responsibilities and impact..."
                    isEditing={isEditing}
                    sectionType="experience_bullet"
                  />
                </div>
              </div>
            )}
          />
        </section>

        <section>
          <h2 className="text-indigo-600 font-semibold uppercase tracking-wide border-b border-gray-200 pb-2 mb-4">Skills</h2>
          {skills ? (
            <div className="flex flex-wrap gap-2">
              {skills.split(",").map((s: string, i: number) => (
                <span key={i} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
                  {s.trim()}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic">Add your skills</p>
          )}
        </section>

        <section>
          <h2 className="text-indigo-600 font-semibold uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">Education</h2>
          {education ? (
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{education}</p>
          ) : (
            <p className="text-gray-400 italic">Add your education details</p>
          )}
        </section>
      </div>
    </div>
  );
}
