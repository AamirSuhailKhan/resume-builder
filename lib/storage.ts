export interface ResumeData {
  id: string;
  title: string;
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

const STORAGE_KEY = "saas_resumes";

export const storage = {
  getResumes: (): ResumeData[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getResume: (id: string): ResumeData | undefined => {
    return storage.getResumes().find((r) => r.id === id);
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
      personal: { name: "", email: "", phone: "", location: "", summary: "" },
      experience: [],
      education: [],
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};
