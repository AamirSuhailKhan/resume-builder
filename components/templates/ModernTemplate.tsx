import React from "react";

export function ModernTemplate({ data }: { data: any }) {
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
    <div className="font-sans bg-white min-h-[1123px] flex flex-col">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">{name || "Your Name"}</h1>
        <p className="text-xl text-indigo-100 mt-2 font-medium">{title || "Professional Title"}</p>
        <div className="flex flex-wrap gap-4 mt-5 text-sm font-medium opacity-90">
          {email && <span>{email}</span>}
          {phone && <span>• {phone}</span>}
          {location && <span>• {location}</span>}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-8 space-y-6 flex-1">
        <section>
          <h2 className="text-indigo-600 font-semibold uppercase tracking-wide border-b border-gray-200 pb-2 mb-3">Summary</h2>
          {summary ? (
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{summary}</p>
          ) : (
            <p className="text-gray-400 italic">Add a professional summary</p>
          )}
        </section>

        <section>
          <h2 className="text-indigo-600 font-semibold uppercase tracking-wide border-b border-gray-200 pb-2 mb-4">Experience</h2>
          {experience.length > 0 ? (
            <div className="space-y-6">
              {experience.map((exp: any, i: number) => (
                <div key={i} className="relative">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-semibold text-lg text-gray-900">{exp.role || "Job Title"}</h4>
                    <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {exp.startDate || "Start"} - {exp.endDate || "Present"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium mb-2">{exp.company || "Company Name"}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {exp.points || exp.description || "Describe your responsibilities and achievements..."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic">Add your work experience</p>
          )}
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
