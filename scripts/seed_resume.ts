import { PrismaClient } from "@prisma/client";
import { normalizeResume } from "../lib/normalizeResume";
import { detectProfile } from "../lib/detectProfile";
import { DashboardService } from "../lib/services/dashboard.service";

const prisma = new PrismaClient();

async function main() {
  console.info("Starting resume seeding script...");
  
  const user = await prisma.user.findFirst({
    where: { email: "aamirsuhailkhan2002@gmail.com" },
  });

  if (!user) {
    console.error("User aamirsuhailkhan2002@gmail.com not found!");
    return;
  }

  const userId = user.id;
  console.info(`Found user ID: ${userId}`);

  // Delete existing resume records to prevent duplication
  await prisma.resume.deleteMany({ where: { userId } });
  await prisma.careerProfile.deleteMany({ where: { userId } });
  await prisma.careerTwin.deleteMany({ where: { userId } });
  await prisma.careerIdentity.deleteMany({ where: { userId } });
  await prisma.readinessScore.deleteMany({ where: { userId } });
  await prisma.outcomePrediction.deleteMany({ where: { userId } });
  await prisma.skillGapAnalysis.deleteMany({ where: { userId } });
  await prisma.actionFeedItem.deleteMany({ where: { userId } });
  await prisma.recruiter.deleteMany({ where: { userId } });
  await prisma.networkContact.deleteMany({ where: { userId } });

  console.info("Cleared old profile and telemetry records.");

  const mockResumeData = {
    personal: {
      firstName: "Aamir Suhail",
      lastName: "Khan",
      email: "aamirsuhailkhan2002@gmail.com",
      phone: "7355431004",
      location: "Gurugram, Haryana, India",
      linkedin: "linkedin.com/in/aamirsuhailkhan",
      website: "github.com/aamirsuhailkhan",
      summary: "Software Engineer and Cybersecurity enthusiast specializing in frontend development, secure applications, role-based access control, and identity governance."
    },
    experience: [
      {
        id: "exp-ekors",
        company: "E-KORS PRIVATE LIMITED",
        role: "Full Stack Developer Intern",
        startDate: "2025-03",
        endDate: "2025-07",
        current: false,
        points: "Developed a secure role-based ERP system using the MERN stack.\nImplemented JWT authentication, REST APIs, and CI/CD deployment workflows.\nWorked on MongoDB schema design, validation, and integration testing."
      },
      {
        id: "exp-smmarters",
        company: "SMMARTERS SOFTWARE PRIVATE LIMITED",
        role: "Frontend Intern",
        startDate: "2023-06",
        endDate: "2023-07",
        current: false,
        points: "Developed frontend features using HTML, CSS, JavaScript, and MongoDB.\nImproved UI performance and worked on secure API integrations."
      },
      {
        id: "exp-rinex",
        company: "RINEX.AI",
        role: "Inside Sales Strategist",
        startDate: "2025-10",
        endDate: "2025-11",
        current: false,
        points: "Worked on lead generation, outreach campaigns, and customer communication.\nCollaborated with teams to improve engagement and business workflows."
      }
    ],
    education: [
      {
        id: "edu-bml",
        institution: "BML MUNJAL UNIVERSITY",
        degree: "B.Tech",
        field: "Computer Science",
        startDate: "2021-08",
        endDate: "2025-05",
        gpa: "6.57"
      },
      {
        id: "edu-flower",
        institution: "LITTLE FLOWER HOUSE",
        degree: "Intermediate",
        field: "CBSE",
        startDate: "2019-04",
        endDate: "2020-03",
        gpa: "81.4"
      },
      {
        id: "edu-gn",
        institution: "GURU NANAK ENGLISH SCHOOL",
        degree: "Matric",
        field: "CBSE",
        startDate: "2017-04",
        endDate: "2018-03",
        gpa: "80"
      }
    ],
    skills: [
      "Identity Governance", "Access Management", "Risk Management", "GRC", "Threat Analysis",
      "Network Security", "Vulnerability Assessment", "C++", "Python", "JavaScript",
      "HTML", "CSS", "ReactJS", "NodeJS", "ExpressJS", "MongoDB", "MongoDB Atlas",
      "Git", "GitHub", "VS Code", "Vercel", "Render"
    ],
    projects: [
      {
        id: "proj-iam",
        name: "IDENTITY ACCESS MANAGEMENT SIMULATION",
        description: "Built a role-based IAM system with JWT authentication and secure access control. Implemented password hashing, authorization workflows, and role-based permissions.",
        url: "https://github.com/aamirsuhailkhan",
        points: "Built a role-based IAM system with JWT authentication.\nImplemented password hashing, authorization workflows, and role-based permissions."
      },
      {
        id: "proj-malware",
        name: "MALWARE DETECTION SYSTEM",
        description: "Developed a malware detection platform for identifying malicious URLs. Achieved 95% accuracy. Used machine learning techniques for cybersecurity threat detection.",
        url: "https://github.com/aamirsuhailkhan",
        points: "Developed a malware detection platform for identifying malicious URLs.\nAchieved 95% accuracy.\nUsed machine learning techniques for cybersecurity threat detection."
      },
      {
        id: "proj-scanner",
        name: "VULNERABILITY SCANNER TOOL",
        description: "Developed a vulnerability and port scanning tool for network security analysis. Generated reports for identifying exposed services and security risks.",
        url: "https://github.com/aamirsuhailkhan",
        points: "Developed a vulnerability and port scanning tool for network security analysis.\nGenerated reports for identifying exposed services and security risks."
      }
    ],
    certifications: [
      { id: "cert-micro", name: "MICROSOFT CYBERSECURITY CERTIFICATE", issuer: "Microsoft", date: "2024" },
      { id: "cert-ai", name: "AI FOR EVERYONE - COURSERA", issuer: "Coursera", date: "2023" },
      { id: "cert-img", name: "IMAGE PROCESSING - DUKE UNIVERSITY", issuer: "Duke University", date: "2023" },
      { id: "cert-iot", name: "IOT - UNIVERSITY OF CALIFORNIA, SAN DIEGO", issuer: "UC San Diego", date: "2022" }
    ],
    customSections: []
  };

  const resume = await prisma.resume.create({
    data: {
      userId,
      title: "Aamir Suhail Khan Resume",
      data: mockResumeData,
      status: "completed",
    },
  });

  console.info(`Resume record created successfully: ${resume.id}`);

  // Trigger dynamic telemetry generation
  await DashboardService.ensureTelemetryData(userId);
  console.info("Dynamic telemetry data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
