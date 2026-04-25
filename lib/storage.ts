import { normalizeResume } from "./normalizeResume";

export interface ResumeData {
  id: string;
  title: string;
  template?: "modern" | "minimal" | "professional";
  personal: {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  experience: Array<{
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    points: string;
  }>;
  education: Array<{
    id: string;
    school: string;
    degree: string;
    year: string;
  }>;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export type ResumeVersion = {
  id: string;
  timestamp: number;
  data: ResumeData;
};

const STORAGE_KEY = "saas_resumes";

export const storage = {
  getResumes: (): ResumeData[] => {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeResume) : [];
    } catch {
      return [];
    }
  },

  getResume: (id: string): ResumeData | undefined => {
    const found = storage.getResumes().find((r) => r.id === id);
    return found ? normalizeResume(found) : undefined;
  },

  saveResume: (resume: ResumeData): void => {
    const resumes = storage.getResumes();
    const existingIndex = resumes.findIndex((r) => r.id === resume.id);

    resume.updatedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      resumes[existingIndex] = resume;
    } else {
      resumes.push(resume);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  },

  updateResume: (id: string, data: Partial<ResumeData>): void => {
    const resumes = storage.getResumes();
    const index = resumes.findIndex((r) => r.id === id);
    
    if (index >= 0) {
      resumes[index] = { 
        ...resumes[index], 
        ...data, 
        updatedAt: new Date().toISOString() 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
    }
  },

  deleteResume: (id: string): void => {
    const resumes = storage.getResumes();
    const filtered = resumes.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  createEmptyResume: (): ResumeData => {
    return {
      id: Date.now().toString(),
      title: "Untitled Resume",
      template: "modern",
      personal: { name: "", email: "", phone: "", location: "", summary: "" },
      experience: [],
      education: [],
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  // VERSION HISTORY METHODS
  getVersions: (resumeId: string): ResumeVersion[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(`resume_versions_${resumeId}`);
    return data ? JSON.parse(data) : [];
  },

  saveVersion: (resume: ResumeData): void => {
    if (typeof window === "undefined") return;
    const versions = storage.getVersions(resume.id);
    
    // Prevent saving if it's identical to the latest version
    if (versions.length > 0) {
      const latest = versions[0];
      // Simple compare for demo purposes
      if (JSON.stringify(latest.data) === JSON.stringify(resume)) return;
    }

    const newVersion: ResumeVersion = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(resume))
    };

    // Keep max 10 versions, newest first
    const updatedVersions = [newVersion, ...versions].slice(0, 10);
    localStorage.setItem(`resume_versions_${resume.id}`, JSON.stringify(updatedVersions));
  },

  restoreVersion: (resumeId: string, versionId: string): ResumeData | null => {
    const versions = storage.getVersions(resumeId);
    const version = versions.find(v => v.id === versionId);
    if (version) {
      // We don't save immediately here so we can return it and let the UI handle the save + state update
      return version.data;
    }
    return null;
  }
};
