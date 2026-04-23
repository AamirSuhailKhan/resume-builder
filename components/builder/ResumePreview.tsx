"use client";

import { ResumeData } from "@/types/resume";
import { ForwardedRef, forwardRef } from "react";

interface ResumePreviewProps {
  data: ResumeData;
}

export const ResumePreview = forwardRef(
  ({ data }: ResumePreviewProps, ref: ForwardedRef<HTMLDivElement>) => {

    const renderExperience = (expList: ResumeData["experience"]) => (
      expList.map((exp) => (
        <div key={exp.id} className="mb-4 last:mb-0">
          <div className="flex justify-between items-baseline mb-1">
            <h3 className="font-bold text-black text-base">
              {exp.company || "Company Name"}
            </h3>
            <span className="text-sm text-gray-600">
              {exp.startDate || "Start"} — {exp.endDate || "Present"}
            </span>
          </div>

          <div className="text-sm font-medium mb-2 text-gray-800">
            {exp.role || "Job Title"}
          </div>

          {exp.points && (
            <div className="text-sm text-gray-700 whitespace-pre-wrap ml-2">
              {exp.points.split("\n").map((point, i) => (
                <div key={i}>• {point}</div>
              ))}
            </div>
          )}
        </div>
      ))
    );

    return (
      <div
        ref={ref}
        className="w-[794px] min-h-[1123px] bg-white text-black p-[40px]"
        style={{
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        {/* HEADER */}
        <header className="border-b pb-4 mb-6 border-gray-300">
          <h1 className="text-3xl font-bold uppercase">
            {data.name || "Your Name"}
          </h1>

          <p className="text-lg text-gray-700 mt-1">
            {data.title || "Professional Title"}
          </p>

          <div className="flex gap-3 mt-3 text-sm text-gray-600">
            {data.email && <span>{data.email}</span>}
            {data.phone && <span>• {data.phone}</span>}
            {data.location && <span>• {data.location}</span>}
          </div>
        </header>

        {/* SUMMARY */}
        {data.summary && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase border-b pb-1 mb-3 border-gray-300">
              Summary
            </h2>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {data.summary}
            </p>
          </section>
        )}

        {/* EXPERIENCE */}
        {data.experience.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase border-b pb-1 mb-3 border-gray-300">
              Experience
            </h2>
            {renderExperience(data.experience)}
          </section>
        )}

        {/* SKILLS + EDUCATION */}
        <div className="grid grid-cols-2 gap-8">
          {data.skills && (
            <section>
              <h2 className="text-sm font-bold uppercase border-b pb-1 mb-3 border-gray-300">
                Skills
              </h2>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {data.skills}
              </div>
            </section>
          )}

          {data.education && (
            <section>
              <h2 className="text-sm font-bold uppercase border-b pb-1 mb-3 border-gray-300">
                Education
              </h2>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {data.education}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }
);

ResumePreview.displayName = "ResumePreview";