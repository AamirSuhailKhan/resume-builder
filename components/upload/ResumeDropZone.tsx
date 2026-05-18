"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useResumeUpload } from "@/hooks/useResumeUpload";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type DropZoneState = "idle" | "uploading" | "success";

function validatePdf(file: File): string | null {
  if (file.type !== "application/pdf") return "Only PDF files are supported";
  if (file.size >= MAX_FILE_SIZE_BYTES) return "PDF must be smaller than 10MB";
  return null;
}

export default function ResumeDropZone({ onSuccess }: { onSuccess?: (result: any) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<DropZoneState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { upload, isUploading, progress, error } = useResumeUpload();

  async function handleFile(file: File) {
    const validationError = validatePdf(file);
    if (validationError) {
      setInlineError(validationError);
      setState("idle");
      return;
    }

    try {
      setInlineError(null);
      setState("uploading");
      const result = await upload(file);
      setState("success");
      if (onSuccess) onSuccess(result);
    } catch {
      setState("idle");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = "";
  }

  const activeError = inlineError ?? error;
  const percentage = isUploading || state === "uploading" ? progress : 0;

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "flex min-h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition",
          isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white hover:border-slate-400",
          state === "success" ? "border-green-500 bg-green-50" : "",
          state === "uploading" ? "cursor-wait border-blue-500 bg-blue-50" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={isUploading}
          onChange={handleInputChange}
        />

        {state === "success" ? (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-green-800">Parsed successfully!</p>
          </>
        ) : state === "uploading" ? (
          <div className="w-full max-w-sm">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-slate-900">Parsing resume...</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-blue-700">{percentage}%</p>
          </div>
        ) : (
          <>
            <FileUp className="h-12 w-12 text-slate-500" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-slate-900">Drop your resume PDF here</p>
            <p className="mt-2 text-sm text-slate-500">or click to choose a file</p>
          </>
        )}
      </div>

      {activeError && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}
