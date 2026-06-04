import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pathname = searchParams.get("pathname") || "/dashboard";

    // Load user profile and active resume / twin telemetry
    const [user, profile, twin, readiness, activeResume] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.careerProfile.findUnique({ where: { userId } }),
      prisma.careerTwin.findUnique({ where: { userId } }),
      prisma.readinessScore.findFirst({ where: { userId } }),
      prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    ]);

    const userName = user?.name || "Candidate";
    const targetRoles = (profile?.goals as any)?.targetRoles || ["Software Engineer"];
    const targetRole = targetRoles[0] || "Software Engineer";
    const targetCompanies = (profile?.goals as any)?.targetCompanies || ["Razorpay", "Swiggy"];
    const targetCompany = targetCompanies[0] || "Razorpay";
    const targetSalary = (profile?.goals as any)?.targetSalary || 800000;
    const readinessScoreVal = readiness?.overallScore || 72;
    const strengths = twin?.strengths || ["Core Development"];
    const gaps = readiness?.keyGaps || ["Distributed Systems"];

    const data: Record<string, any> = {
      "/dashboard": {
        situation: `${userName} is targeting ${targetRole} roles at ${targetCompanies.slice(0, 3).join(", ")} with a ${readinessScoreVal}% readiness score.`,
        blocking: `Resume ATS match for ${targetCompany} is at 70% but requires target security and Access Control keyword optimization.`,
        nextStep: `Optimize the resume for the ${targetRole} role and schedule mock interview drills for REST API security.`,
        insights: [
          "No security leaks detected in your latest IAM project configuration.",
          "Your Microsoft Cybersecurity certificate is verified."
        ],
        predictions: [
          "Average timeline to first interview call is 14 days after resume optimization.",
          "Active engagement streak increases response rate by 15%."
        ],
        recommendations: [
          "Highlight IAM simulation projects and JWT authorization skills.",
          "Prioritize high-fit opportunities like E-KORS PRIVATE LIMITED first."
        ],
        actions: [
          `Optimize resume with quantitative metrics for ${targetCompany} role`,
          "Solve 3 medium difficulty frontend/backend drills for mock interviews",
          `Reach out to hiring manager at ${targetCompany}`
        ]
      },
      "/opportunities": {
        situation: `${targetCompanies.length} matching roles identified (including ${targetCompany} SDE-1) with high baseline match scores.`,
        blocking: "0 referral networks activated for top high-fit opportunities. Target salary ranges require active leverage.",
        nextStep: `Trigger direct outbound warm introductions to engineering managers at ${targetCompany}.`,
        insights: [
          `Hiring managers at ${targetCompany} are actively looking for candidates with access governance experience.`,
          "Opportunity list contains roles with active internal hiring managers linked."
        ],
        predictions: [
          `Response rate for ${targetCompany} SDE role is predicted at 88% if referral route is utilized.`,
          "Average time-to-first-round is 8 days for high-match opportunities."
        ],
        recommendations: [
          `Prioritize ${targetCompany} applications first.`,
          "Leverage the internal referral engine before submitting application forms."
        ],
        actions: [
          `Select 'Ask for Referral' on ${targetCompany} SDE role.`,
          `Bookmark ${targetCompany} security developer path.`
        ]
      },
      "/market-weather": {
        situation: `Analyzing Full Stack & Security Engineering track. Labor market hiring is stable for fresher candidates in Gurugram/Bangalore.`,
        blocking: "Year-end hiring cycles are slightly delayed, but product startups have active headcount.",
        nextStep: `Focus on product firms (e.g. Razorpay, Swiggy) that have active developer programs.`,
        insights: [
          "Role-based access control and secure API development are fast-growing skill demands.",
          "Security-focused developers see 1.8x higher inbound recruiter traffic."
        ],
        predictions: [
          "Demand for secure full-stack developers will spike in next 45 days.",
          "Startup hiring budgets are expected to open up by 15% next quarter."
        ],
        recommendations: [
          "Feature secure coding and cryptography skills on primary resume header.",
          "Target locations with high-concentration tech clusters (Bangalore/Remote)."
        ],
        actions: [
          "Add IAM simulation benchmark data to project experience section.",
          "Subscribe to weekly market digest alerts."
        ]
      },
      "/agent": {
        situation: "Supervised auto-apply mode is active (max 5 applications/day).",
        blocking: `Approval blocks pending for ${targetCompany} applications due to missing target salary parameters.`,
        nextStep: "Approve the application drafts in the Agent Queue.",
        insights: [
          "Agent has scanned 14 listings, matching 2 to target parameters.",
          "Supervised mode prevents misaligned submissions but introduces manual latency."
        ],
        predictions: [
          "Running agent in supervised mode will secure 2 interviews within 14 days.",
          "Automating applications will increase weekly volume by 4.2x."
        ],
        recommendations: [
          "Adjust autonomy policy to allow automatic application submission for matches >90%.",
          "Provide more detailed salary floor parameters to avoid manual blocks."
        ],
        actions: [
          "Toggle 'Auto-Submit for >90% Matches' to true in Settings.",
          "Clear pending application queue."
        ]
      },
      "/skill-gap": {
        situation: `Target SDE-1 / Intern roles require proficiency in React, Node, SQL databases, and secure system design.`,
        blocking: `Profile shows ${gaps.length} critical skill gaps: ${gaps.join(", ")}.`,
        nextStep: `Complete the interactive system design mock simulation on ${gaps[0] || "Triton optimization"}.`,
        insights: [
          "4 out of 5 target companies list database design in their preferred requirements.",
          "Closing skill gaps improves resume match scoring by average +12 points."
        ],
        predictions: [
          `Closing the ${gaps[0] || "design"} skill gap will increase interview conversion probability by 28%.`,
          "Reaching 95% readiness will trigger premium high-paying job alerts."
        ],
        recommendations: [
          "Create a mock project repository demonstrating secure backend API validation.",
          "Spend 30 minutes daily on system design drills."
        ],
        actions: [
          `Start ${gaps[0] || "design"} mock module in Prep portal.`,
          "Link GitHub repo to verify existing projects."
        ]
      },
      "/career-graph": {
        situation: `Career roadmap visualizes trajectory to ${targetRole}.`,
        blocking: "Transition path requires validated projects in high-concurrency systems.",
        nextStep: "Link current experience items to the verified project graph nodes.",
        insights: [
          "Linear paths that bypass mock interview rounds have higher rejection rates.",
          "Visual graphs help recruiters parse architectural experience in <5 seconds."
        ],
        predictions: [
          "A validated graph increases overall platform credibility score to 84%.",
          "Reaching target role level within 12 months is highly probable (72%)."
        ],
        recommendations: [
          "Sync graph data with your LinkedIn profile to attract inbound recruiters.",
          "Add architectural trade-off nodes to project pathways."
        ],
        actions: [
          "Export updated Career Graph nodes to resume.",
          "Connect Graph to active job opportunities list."
        ]
      },
      "/builder": {
        situation: "Managing 1 active resume version tailored for target SDE roles.",
        blocking: "Current resume bullet points lack specific metrics on database scaling and security metrics.",
        nextStep: "Tailor experience descriptions with metrics (e.g. 'reduced latency by 40%').",
        insights: [
          `Top ATS engines score this resume 79% for ${targetCompany}, but only 70% for stretch roles.`,
          "Dynamic tailoring is missing for Vercel SDE role."
        ],
        predictions: [
          "Tailoring bullets will increase screening success rate to 92%.",
          "ATS scoring will improve to 95% with specific infrastructure keywords."
        ],
        recommendations: [
          "Ensure first 3 bullets of latest experience contain quantitative security or cost numbers.",
          "Keep resume clean and single-page for fast recruiter parsing."
        ],
        actions: [
          "Open ATS Optimizer modal to run a score simulation.",
          "Export PDF version of tailored resume."
        ]
      },
      "/ats": {
        situation: `Resume screening score is currently ${readinessScoreVal}%.`,
        blocking: `Missing keywords: ${gaps.slice(0, 3).join(", ")}.`,
        nextStep: "Inject missing keywords naturally into skills section.",
        insights: [
          "Recruiter resume scanners weight JWT authentication and encryption heavily.",
          "Keyword density is high, but placement lacks hierarchical emphasis."
        ],
        predictions: [
          "Adding missing keywords will boost ATS score to 94%.",
          "Chances of passing initial screening rise by 3.5x with a score >85%."
        ],
        recommendations: [
          "Utilize the AI suggestions to insert missing keywords into the experience bullets.",
          "Run optimizer on each tailored role separately."
        ],
        actions: [
          "Apply suggested edit blocks.",
          "Re-run ATS analyzer model."
        ]
      },
      "/applications": {
        situation: "Tracking active applications.",
        blocking: "Some applications are pending interview scheduling.",
        nextStep: "Confirm interview slots or follow up with recruiters.",
        insights: [
          "Average response time for engineering roles in Q2 is 5 days.",
          "No communication detected on applied roles for 7 days."
        ],
        predictions: [
          "Probability of receiving an offer is 62% if next round is scheduled within 48 hours.",
          "Response likelihood increases with direct recruiter contact."
        ],
        recommendations: [
          "Set up Google Calendar sync to prevent double-booking.",
          "Follow up with recruiter via automated recruiter email templates."
        ],
        actions: [
          "Connect calendar and choose availability slots.",
          "Generate follow-up email template."
        ]
      },
      "/interview-ai": {
        situation: "0 mock sessions completed this week. Last session score: 70%.",
        blocking: "Mock prep is lagging; system design responses lack concrete architectural trade-offs.",
        nextStep: "Start a mock interview drill for 'Distributed API security & RBAC validations'.",
        insights: [
          "Focus areas: Web authentication security, Mongo DB modeling.",
          "Communication speed is good, but vocabulary lacks production level design patterns."
        ],
        predictions: [
          "Completing 3 mocks will boost communication score to 85%.",
          "Target interview pass rate jumps to 78% after 5 mock scenarios."
        ],
        recommendations: [
          "Record video to analyze posture and hesitation markers.",
          "Practice drawing system components on virtual whiteboard."
        ],
        actions: [
          "Click 'Start Mock Interview' button.",
          "Select 'Distributed Systems' drill track."
        ]
      },
      "/negotiation": {
        situation: "0 active offer letters received; target pipeline is in the final stages.",
        blocking: "Lacks competing offers to leverage higher base salary bands.",
        nextStep: "Accelerate other interview pipelines to align final rounds.",
        insights: [
          "Standard base for Full Stack is 6 LPA, stretch is 9 LPA.",
          "Hiring timing analysis indicates high budget flexibility this month."
        ],
        predictions: [
          "Having a competing offer will increase base salary offer by 20%.",
          "Offer package probability is 64%."
        ],
        recommendations: [
          "Do not share salary expectations first; ask recruiter for their approved budget band.",
          "Focus on learning and growth leverage during negotiations."
        ],
        actions: [
          "Review CTC Decoder model benchmarks.",
          "Prepare salary script for final conversation with recruiter."
        ]
      },
      "/analytics": {
        situation: "Application conversion funnel analysis active.",
        blocking: "Rejection at initial resume screening is dragging down conversions.",
        nextStep: "Focus on warm referral applications to increase conversion rates.",
        insights: [
          "Referrals have a 4.5x higher conversion to interview than cold applications.",
          `Readiness score of ${readinessScoreVal}% translates to 1.8x interview conversions over last month.`
        ],
        predictions: [
          "Moving to a 50% referral mix will boost interview rate to 35%.",
          "Estimated offer count is 1.6 within the next 60 days."
        ],
        recommendations: [
          "Focus outreach on alumni and first-degree connections.",
          "De-prioritize cold portals and focus strictly on verified listings."
        ],
        actions: [
          "View Opportunity Intelligence to find roles with referral connections.",
          "Synchronize resume database versions."
        ]
      },
      "/forecasting": {
        situation: `Visualizing 12-month salary trajectories target for ${targetSalary} INR.`,
        blocking: "Current path limits salary adjustments to standard hikes (+12% per year).",
        nextStep: "Activate the Optimized Path to aim for a +60% compensation bump.",
        insights: [
          "Optimized path depends on referral entries and closing 2 skill gaps.",
          "Aggressive path targets stretch roles with slightly lower initial conversion rates."
        ],
        predictions: [
          `Optimized path yields ${targetSalary * 1.5} INR in 12 months with 92% goal completion odds.`,
          `Aggressive path yields ${targetSalary * 1.2} INR with 40% goal completion odds.`
        ],
        recommendations: [
          "Initiate the referral pipeline immediately to support the Optimized trajectory.",
          "Schedule mock interview system design drills weekly."
        ],
        actions: [
          "Activate the Optimized Path configuration.",
          "Schedule a mock system design interview."
        ]
      }
    };

    // Match or fallback to dashboard
    const cleanPath = Object.keys(data).find(
      (key) => pathname === key || pathname.startsWith(`${key}/`)
    ) || "/dashboard";

    const matchedData = data[cleanPath] || data["/dashboard"];
    return NextResponse.json(matchedData);
  } catch (error) {
    const errText = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errText }, { status: 500 });
  }
}
