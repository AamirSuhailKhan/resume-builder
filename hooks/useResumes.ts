"use client";

import { useState, useEffect } from "react";
import { ResumeData, initialResumeData } from "@/types/resume";

const STORAGE_KEY = "resume_builder_data";

export function useResumes() {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setResumes(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse resumes from localStorage", e);
        setResumes([initialResumeData]);
      }
    } else {
      // Initialize with mock if empty
      setResumes([initialResumeData]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([initialResumeData]));
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage whenever resumes state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
    }
  }, [resumes, isLoaded]);

  const saveResume = (resume: ResumeData) => {
    setResumes(prev => {
      const exists = prev.findIndex(r => r.id === resume.id);
      const updatedResume = { ...resume, lastModified: Date.now() };
      if (exists >= 0) {
        const newResumes = [...prev];
        newResumes[exists] = updatedResume;
        return newResumes;
      }
      return [...prev, updatedResume];
    });
  };

  const getResume = (id: string) => {
    return resumes.find(r => r.id === id) || null;
  };

  const deleteResume = (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
  };

  const createResume = () => {
    const newResume: ResumeData = {
      ...initialResumeData,
      id: Date.now().toString(),
      name: "New Resume",
      lastModified: Date.now()
    };
    setResumes(prev => [...prev, newResume]);
    return newResume;
  };

  return {
    resumes,
    saveResume,
    getResume,
    deleteResume,
    createResume,
    isLoaded
  };
}
