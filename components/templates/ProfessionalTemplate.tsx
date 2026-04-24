import React from "react";

export function ProfessionalTemplate({ data }: { data: any }) {
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
    <div className="grid grid-cols-3 min-h-[1123px] bg-white font-sans text-left">
      {/* LEFT SIDEBAR */}
      <div className="col-span-1 bg-gray-100 p-6 border-r border-gray-200 flex flex-col space-y-8">
        <section>
          <h2 className="text-gray-700 font-semibold uppercase tracking-wider border-b border-gray-300 pb-2 mb-4 text-sm">Contact</h2>
          <div className="space-y-3 text-sm text-gray-600 break-words">
            {email ? <p>{email}</p> : <p className="italic text-gray-400">Email missing</p>}
            {phone ? <p>{phone}</p> : <p className="italic text-gray-400">Phone missing</p>}
            {location ? <p>{location}</p> : <p className="italic text-gray-400">Location missing</p>}
          </div>
        </section>

        <section>
          <h2 className="text-gray-700 font-semibold uppercase tracking-wider border-b border-gray-300 pb-2 mb-4 text-sm">Skills</h2>
          {skills ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {skills.split(",").map((s: string, i: number) => (
                <li key={i} className="flex items-start">
                  <span className="mr-2 text-gray-400 mt-0.5">•</span>
                  <span>{s.trim()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 italic text-sm">Add your skills</p>
          )}
        </section>
        
        <section>
          <h2 className="text-gray-700 font-semibold uppercase tracking-wider border-b border-gray-300 pb-2 mb-4 text-sm">Education</h2>
          {education ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{education}</p>
          ) : (
            <p className="text-gray-400 italic text-sm">Add your education</p>
          )}
        </section>
      </div>

      {/* RIGHT CONTENT */}
      <div className="col-span-2 p-8 space-y-8">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{name || "Your Name"}</h1>
          <p className="text-xl text-gray-600 mt-2 font-medium">{title || "Professional Title"}</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-gray-700 font-semibold uppercase tracking-wide border-b border-gray-200 pb-2 text-sm">Professional Summary</h2>
          {summary ? (
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">{summary}</p>
          ) : (
            <p className="text-gray-400 italic text-sm">Add a professional summary</p>
          )}
        </section>

        <section className="space-y-6">
          <h2 className="text-gray-700 font-semibold uppercase tracking-wide border-b border-gray-200 pb-2 text-sm">Experience</h2>
          {experience.length > 0 ? (
            <div className="space-y-6">
              {experience.map((exp: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-lg text-gray-900">{exp.role || "Job Title"}</h4>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {exp.startDate || "Start"} — {exp.endDate || "Present"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 font-semibold mb-2">{exp.company || "Company Name"}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {exp.points || exp.description || "Describe your responsibilities..."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">Add your work experience</p>
          )}
        </section>
      </div>
    </div>
  );
}
