import { ResumeData } from "@/lib/storage";

// Simulated AI API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const ResumeAI = {
  /**
   * Improves a professional summary using simulated AI.
   * Can be replaced with actual fetch to /api/openai/summary
   */
  async enhanceSummary(originalText: string): Promise<string> {
    await delay(1800);
    
    if (!originalText || originalText.length < 10) {
      return "Results-driven professional with a proven track record of delivering high-quality solutions. Adaptable team player with strong communication skills and a passion for continuous learning and driving business growth.";
    }

    return `Dynamic and results-oriented professional leveraging advanced expertise to drive innovation and streamline operations. Recognized for translating complex challenges into scalable, high-impact solutions while fostering collaborative, cross-functional team environments. Proven track record of consistently exceeding performance metrics and delivering exceptional value to stakeholders.`;
  },

  /**
   * Enhances job experience bullet points using simulated AI.
   * Can be replaced with actual fetch to /api/openai/experience
   */
  async enhanceExperience(points: string): Promise<string> {
    await delay(2000);
    
    if (!points || points.length < 5) {
      return "• Spearheaded strategic initiatives that resulted in a 20% increase in overall efficiency.\n• Collaborated cross-functionally to deliver key projects ahead of schedule.\n• Optimized existing workflows, reducing operational costs significantly.";
    }

    // A simple mock transformation to make it look "enhanced"
    return `• Orchestrated the development and deployment of high-impact technical solutions, resulting in a 35% increase in system performance.
• Mentored and led a cross-functional team of engineers, fostering a culture of continuous integration and agile methodologies.
• Redesigned legacy architecture to modernize the technology stack, significantly reducing technical debt and deployment times.`;
  },

  /**
   * Analyzes resume for ATS compatibility.
   * Can be replaced with actual fetch to /api/openai/ats
   */
  async analyzeATS(data: ResumeData) {
    await delay(2500);

    const score = Math.floor(Math.random() * (95 - 65 + 1) + 65); // Random score between 65 and 95
    
    return {
      score,
      missingKeywords: ["Agile Methodologies", "Stakeholder Management", "CI/CD", "Data Analytics"],
      weakSections: ["Skills", "Summary length"],
      suggestions: [
        "Your summary is slightly generic. Try adding a measurable metric (e.g., 'increased sales by 20%').",
        "Add more action verbs to the beginning of your experience bullet points (e.g., 'Spearheaded', 'Architected').",
        "Ensure your skills section matches the exact phrasing used in the job description you are targeting."
      ]
    };
  }
};
