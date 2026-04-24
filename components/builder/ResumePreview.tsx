"use client";
console.log("🔥 ResumePreview RENDERED");
import { forwardRef, ForwardedRef } from "react";
import { ModernTemplate } from "@/components/templates/ModernTemplate";
import { MinimalTemplate } from "@/components/templates/MinimalTemplate";
import { ProfessionalTemplate } from "@/components/templates/ProfessionalTemplate";

type Props = {
  data: any;
};

export const ResumePreview = forwardRef(
  ({ data }: Props, ref: ForwardedRef<HTMLDivElement>) => {
    const template = data?.template || "modern";

    // 🔍 Debug (remove later)
    console.log("Current Template:", template);

    return (
      <div
        ref={ref}
        className="w-[794px] min-h-[1123px] bg-white"
        style={{
          backgroundColor: "#ffffff",
        }}
      >
        {/* 🔥 IMPORTANT: No shared padding/wrapper here */}

        {template === "modern" && <ModernTemplate data={data} />}
        {template === "minimal" && <MinimalTemplate data={data} />}
        {template === "professional" && (
          <ProfessionalTemplate data={data} />
        )}
      </div>
    );
  }
);

ResumePreview.displayName = "ResumePreview";