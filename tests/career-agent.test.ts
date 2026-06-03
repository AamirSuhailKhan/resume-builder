/**
 * tests/career-agent.test.ts
 *
 * Unit tests for the Autonomous Career Agent.
 * Uses vitest globals (defined in vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Server Only ─────────────────────────────────────────────────────────
vi.mock("server-only", () => ({}));

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockPrisma = {
  careerTwin: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  twinMemory: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  twinEvent: {
    create: vi.fn(),
  },
  roadmapSnapshot: {
    create: vi.fn(),
  },
  preparationRoadmap: {
    create: vi.fn(),
  },
  careerProfile: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  resume: {
    findFirst: vi.fn(),
  },
  skillGapAnalysis: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  hiringContact: {
    findMany: vi.fn(),
  },
  jobOpportunity: {
    findMany: vi.fn(),
  },
  actionFeedItem: {
    create: vi.fn(),
  },
  interviewProgress: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  careerIdentity: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  application: {
    count: vi.fn(),
  },
  interviewMockSession: {
    count: vi.fn(),
  },
  $executeRaw: vi.fn(),
};

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

// ─── Mock AI Execution Layer ──────────────────────────────────────────────────
const mockGeminiJSON = vi.fn();
vi.mock("@/lib/ai/core", () => ({
  geminiJSON: mockGeminiJSON,
  claudeJSON: vi.fn(),
  executeAI: vi.fn(),
}));

// ─── Mock Memory Service ─────────────────────────────────────────────────────
const mockMemoryService = {
  embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  upsertMemory: vi.fn().mockResolvedValue({ id: "mem-1" }),
};
vi.mock("@/lib/services/memory.service", () => ({
  memoryService: mockMemoryService,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CareerOS Autonomous Agent Subsystems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AgentMemory Layer", () => {
    it("getOrCreateTwin returns existing twin", async () => {
      const existing = { id: "twin-1", userId: "user-1", status: "active" };
      mockPrisma.careerTwin.findUnique.mockResolvedValue(existing);

      const { AgentMemory } = await import("@/lib/agent/memory");
      const twin = await AgentMemory.getOrCreateTwin("user-1");

      expect(twin).toEqual(existing);
      expect(mockPrisma.careerTwin.findUnique).toHaveBeenCalledOnce();
      expect(mockPrisma.careerTwin.create).not.toHaveBeenCalled();
    });

    it("getOrCreateTwin initializes new twin when missing", async () => {
      mockPrisma.careerTwin.findUnique.mockResolvedValue(null);
      mockPrisma.careerTwin.create.mockResolvedValue({ id: "new-twin" });
      mockPrisma.twinEvent.create.mockResolvedValue({});

      const { AgentMemory } = await import("@/lib/agent/memory");
      const twin = await AgentMemory.getOrCreateTwin("user-2");

      expect(twin.id).toBe("new-twin");
      expect(mockPrisma.careerTwin.create).toHaveBeenCalledOnce();
    });

    it("addMemory upserts to databases successfully", async () => {
      mockPrisma.careerTwin.findUnique.mockResolvedValue({ id: "twin-1" });
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.twinEvent.create.mockResolvedValue({});

      const { AgentMemory } = await import("@/lib/agent/memory");
      await AgentMemory.addMemory("user-1", {
        type: "skill",
        title: "Learned TypeScript",
        content: "Mastered basic types, generics, and namespaces.",
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockMemoryService.upsertMemory).toHaveBeenCalled();
    });
  });

  describe("GoalDecompositionEngine", () => {
    it("deconstructs target roles into structured milestones", async () => {
      mockGeminiJSON.mockResolvedValue({
        targetRole: "Backend Engineer",
        targetCompany: "Google",
        timelineWeeks: 12,
        milestones: [
          { id: "m1", title: "API Foundations", description: "Design principles", timeframeWeeks: 4, dependencies: [] },
        ],
        tasks: [
          { id: "t1", milestoneId: "m1", title: "Learn Go", description: "Standard lib", type: "skill_acquisition", metadata: {} },
        ],
      });

      mockPrisma.careerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.careerProfile.upsert.mockResolvedValue({});

      const { GoalDecompositionEngine } = await import("@/lib/agent/goals");
      const decomp = await GoalDecompositionEngine.decompose("user-1", "I want a Google backend job in 12 weeks", {
        skills: ["Go"],
        experience: [],
        education: [],
      });

      expect(decomp.targetRole).toBe("Backend Engineer");
      expect(decomp.targetCompany).toBe("Google");
      expect(decomp.milestones).toHaveLength(1);
      expect(decomp.tasks).toHaveLength(1);
      expect(mockPrisma.careerProfile.upsert).toHaveBeenCalledOnce();
    });
  });

  describe("ProgressTrackingEngine", () => {
    it("marks task complete, updates streak, and logs audits", async () => {
      const activeRoadmap = {
        id: "road-1",
        phases: [
          {
            phaseNumber: 1,
            title: "Phase 1",
            focus: "Initial study",
            weeks: [1],
            milestones: ["m1"],
            weeklyPlans: [
              {
                weekNumber: 1,
                focus: "Study",
                objectives: [],
                actionItems: [
                  { id: "task-1", title: "Finish Leetcode", completed: false, type: "interview_prep", estimatedHours: 4 },
                ],
              },
            ],
          },
        ],
      };

      mockPrisma.careerTwin.findUnique.mockResolvedValue({
        id: "twin-1",
        activePlan: activeRoadmap,
      });
      mockPrisma.careerTwin.update.mockResolvedValue({});
      mockPrisma.interviewProgress.findFirst.mockResolvedValue(null);
      mockPrisma.interviewProgress.create.mockResolvedValue({});
      mockPrisma.twinEvent.create.mockResolvedValue({});
      mockPrisma.actionFeedItem.create.mockResolvedValue({});

      const { ProgressTrackingEngine } = await import("@/lib/agent/progress");
      const updated = await ProgressTrackingEngine.completeTask("user-1", "road-1", "task-1");

      expect(updated).not.toBeNull();
      expect(updated?.phases[0]?.weeklyPlans[0]?.actionItems[0]?.completed).toBe(true);
      expect(mockPrisma.careerTwin.update).toHaveBeenCalledOnce();
    });
  });

  describe("WeeklyAdaptationEngine", () => {
    it("analyzes missing weekly objectives and returns adaptation reports", async () => {
      const activeRoadmap = {
        id: "road-1",
        targetRole: "Fullstack Engineer",
        phases: [
          {
            phaseNumber: 1,
            weeks: [1, 2],
            weeklyPlans: [
              {
                weekNumber: 1,
                focus: "Skills acquisition",
                objectives: ["Study React"],
                actionItems: [
                  { id: "t-1", title: "Study React", completed: false, type: "skill_acquisition", estimatedHours: 6 },
                ],
              },
              {
                weekNumber: 2,
                focus: "Next step",
                objectives: [],
                actionItems: [],
              },
            ],
          },
        ],
      };

      mockPrisma.careerTwin.findUnique.mockResolvedValue({
        id: "twin-1",
        activePlan: activeRoadmap,
      });

      mockPrisma.application.count.mockResolvedValue(2);
      mockPrisma.interviewMockSession.count.mockResolvedValue(1);

      mockGeminiJSON.mockResolvedValue({
        reasonsForChange: ["Missed React objectives"],
        adjustments: [
          { type: "reschedule_task", description: "Rescheduled Study React to week 2", details: {} },
        ],
        newWeeklyPlans: [
          {
            weekNumber: 2,
            focus: "Remedial React Study",
            objectives: ["Study React", "Study Next.js"],
            actionItems: [
              { title: "Study React", description: "Review missed topic", type: "skill_acquisition", estimatedHours: 4 },
            ],
          },
        ],
      });

      mockPrisma.careerTwin.update.mockResolvedValue({});
      mockPrisma.twinEvent.create.mockResolvedValue({});
      mockPrisma.actionFeedItem.create.mockResolvedValue({});

      const { WeeklyAdaptationEngine } = await import("@/lib/agent/adaptation");
      const report = await WeeklyAdaptationEngine.adaptRoadmap("user-1", 1);

      expect(report).not.toBeNull();
      expect(report?.adaptationWeekNumber).toBe(2);
      expect(report?.reasonsForChange).toContain("Missed React objectives");
      expect(mockPrisma.careerTwin.update).toHaveBeenCalledOnce();
    });
  });
});
