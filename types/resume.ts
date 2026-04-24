export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  points: string;
}

export interface ResumeData {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Experience[];
  education: string;
  skills: string[];
  templateId: "minimal" | "modern" | "professional";
  lastModified: number;
}

export const initialResumeData: ResumeData = {
  id: "1",
  name: "Alex Morgan",
  title: "Senior Frontend Developer",
  email: "alex.morgan@example.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  summary: "Passionate Frontend Developer with 5+ years of experience building scalable web applications. Proficient in React, Next.js, and TypeScript with a strong focus on UI/UX and performance.",
  templateId: "minimal",
  lastModified: Date.now(),
  experience: [
    {
      id: "1",
      company: "TechCorp Inc.",
      role: "Senior Developer",
      startDate: "2021-03",
      endDate: "",
      points: "• Led frontend team to migrate legacy React app to Next.js, improving load time by 40%.\n• Implemented a cohesive design system used across 5 internal products."
    },
    {
      id: "2",
      company: "Creative Web",
      role: "Frontend Developer",
      startDate: "2018-06",
      endDate: "2021-02",
      points: "• Developed highly responsive SPAs using React.\n• Collaborated with design team for pixel-perfect UI."
    }
  ],
  education: "Bachelor of Science in Computer Science\nUniversity of Technology, San Francisco, CA (2014 - 2018)",
  skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "JavaScript", "HTML/CSS", "GraphQL"]
};
