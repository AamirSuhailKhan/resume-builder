/**
 * Regression guard — verifies all AI routes return 401 when called without
 * an authenticated session. If auth is accidentally removed from a route,
 * this test will catch it immediately.
 *
 * Run with: npm test (or vitest / jest depending on project config)
 */

const AI_ROUTES = [
  "/api/optimize",
  "/api/ats",
  "/api/improve",
  "/api/analyze-job",
  "/api/generate-job",
  "/api/generate-application",
  "/api/job/analyze",
  "/api/job/insights",
  "/api/ai/optimize-resume",
];

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

describe("AI routes — unauthenticated requests must return 401", () => {
  for (const route of AI_ROUTES) {
    it(`${route} returns 401 without session`, async () => {
      const res = await fetch(`${BASE_URL}${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: {}, jobDescription: "test" }),
      });
      expect(res.status).toBe(401);
    }, 25000);
  }
});
