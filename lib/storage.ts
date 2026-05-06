export interface ResumeData {
  id: string;
  title: string;
  status?: "completed" | "pending" | "processing" | "failed";
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
