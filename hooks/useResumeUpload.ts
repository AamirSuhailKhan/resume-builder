"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type UploadResponse = {
  resumeId: string;
};

export function useResumeUpload() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback((file: File): Promise<UploadResponse> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/resume/upload");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        setProgress(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onload = () => {
        setIsUploading(false);

        let response: Partial<UploadResponse> & { error?: string } = {};
        try {
          response = JSON.parse(xhr.responseText);
        } catch {
          response = {};
        }

        if (xhr.status >= 200 && xhr.status < 300 && response.resumeId) {
          const result = { resumeId: response.resumeId };
          setProgress(100);
          router.push(`/builder?id=${result.resumeId}`);
          resolve(result);
          return;
        }

        const message = response.error ?? "Resume upload failed.";
        setError(message);
        reject(new Error(message));
      };

      xhr.onerror = () => {
        const message = "Network error while uploading resume.";
        setIsUploading(false);
        setError(message);
        reject(new Error(message));
      };

      xhr.onabort = () => {
        const message = "Resume upload canceled.";
        setIsUploading(false);
        setError(message);
        reject(new Error(message));
      };

      xhr.send(formData);
    });
  }, [router]);

  return {
    upload,
    isUploading,
    progress,
    error,
  };
}
