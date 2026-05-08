import React from "react";
import { ResumeData } from "@/lib/storage";

type TemplateResumeData = ResumeData & {
  personal: ResumeData["personal"] & { fullName?: string; title?: string };
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
};

export function MinimalTemplate({ data }: { data: TemplateResumeData }) {
  const name = data?.personal?.fullName || data?.personal?.name || data?.name || "";
  const title = data?.personal?.title || data?.title || "";
  const email = data?.personal?.email || data?.email || "";
  const phone = data?.personal?.phone || data?.phone || "";
  const location = data?.personal?.location || data?.location || "";
  const summary = data?.personal?.summary || data?.summary || "";
  const experience: Array<ResumeData["experience"][number] & { description?: string }> = data?.experience || [];
  const skills = Array.isArray(data?.skills) ? data.skills.join(", ") : data?.skills;
  const education = Array.isArray(data?.education) 
    ? data.education.map((e) => `${e.degree || ''} ${e.school || ''}`).join("\n")
    : data?.education;

  return (
    <div className="p-10 text-black bg-white font-serif min-h-[1123px] text-left">
      <h1 className="text-3xl font-bold">{name || "Your Name"}</h1>
      <p className="text-lg mt-1 text-gray-800">{title || "Professional Title"}</p>
      
      <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600 font-sans">
        {email && <span>{email}</span>}
        {phone && <span>• {phone}</span>}
        {location && <span>• {location}</span>}
      </div>
      
      <hr className="my-6 border-black border-t-[1.5px]" />
      
      <div className="space-y-8">
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-3">Summary</h2>
          {summary ? (
            <p className="whitespace-pre-wrap leading-relaxed text-gray-900">{summary}</p>
          ) : (
            <p className="text-gray-400 italic font-sans text-sm">Add a professional summary</p>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-4">Experience</h2>
          {experience.length > 0 ? (
            <div className="space-y-6">
              {experience.map((exp, i: number) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-lg">{exp.role || "Job Title"}</h3>
                    <span className="text-sm text-gray-600 font-sans font-medium">
                      {exp.startDate || "Start"} — {exp.endDate || "Present"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 italic mb-2 font-sans">{exp.company || "Company Name"}</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 font-sans">
                    {exp.points || exp.description || "Describe your responsibilities..."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic font-sans text-sm">Add your work experience</p>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-3">Skills</h2>
          {skills ? (
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed font-sans text-sm">{skills}</p>
          ) : (
            <p className="text-gray-400 italic font-sans text-sm">Add your skills</p>
          )}
        </section>
        
        <section>
          <h2 className="text-sm uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-3">Education</h2>
          {education ? (
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed font-sans text-sm">{education}</p>
          ) : (
            <p className="text-gray-400 italic font-sans text-sm">Add your education details</p>
          )}
        </section>
      </div>
    </div>
  );
}
