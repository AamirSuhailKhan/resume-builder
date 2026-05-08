"use client";

import { forwardRef, ForwardedRef } from "react";
import { ModernTemplate } from "@/components/templates/ModernTemplate";
import { MinimalTemplate } from "@/components/templates/MinimalTemplate";
import { ProfessionalTemplate } from "@/components/templates/ProfessionalTemplate";
import { ResumeData } from "@/lib/storage";

export type RenderMode = "edit" | "preview" | "pdf";

interface Props {
  data: ResumeData;
  /** Controls how the resume is rendered. Edit adds interactivity, others are read-only. */
  renderMode?: RenderMode;
}

export const ResumePreview = forwardRef(
  ({ data, renderMode = "edit" }: Props, ref: ForwardedRef<HTMLDivElement>) => {
    const template = data?.template || "modern";
    
    // Migration safe: pass both renderMode and isEditing (derived) down to templates
    const isEditing = renderMode === "edit";

    return (
      <div
        ref={ref}
        className="w-[794px] min-h-[1123px] bg-white"
        style={{ backgroundColor: "#ffffff" }}
      >
        {template === "modern" && (
          <ModernTemplate data={data} renderMode={renderMode} isEditing={isEditing} />
        )}
        {template === "minimal" && <MinimalTemplate data={data} />}
        {template === "professional" && <ProfessionalTemplate data={data} />}
      </div>
    );
  }
);

ResumePreview.displayName = "ResumePreview";
