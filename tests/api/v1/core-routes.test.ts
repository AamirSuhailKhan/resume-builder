/**
 * Auth guard regression tests.
 * Verifies all protected v1 API routes return 401 without authentication.
 * Follows the same pattern as auth.test.ts — requires dev server on port 3000.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { execFileSync } from "node:child_process";

const AUTHED_ROUTES: Array<{ method: string; path: string; body?: object }> = [
  { method: "GET", path: "/api/v1/career-profile" },
  { method: "GET", path: "/api/v1/resumes" },
  { method: "GET", path: "/api/v1/jobs/matches" },
  { method: "GET", path: "/api/v1/analytics/health" },
  { method: "POST", path: "/api/v1/ctc/decode", body: { taxRegime: "new" } },
  {
    method: "POST",
    path: "/api/v1/negotiation/analyze",
    body: {
      jobTitle: "SDE",
      companyName: "Test",
      offerBase: 1000000,
      location: "Bengaluru",
      currency: "INR",
    },
  },
  {
    method: "POST",
    path: "/api/v1/offers/compare",
    body: { offers: [], priorities: {} },
  },
  {
    method: "POST",
    path: "/api/v1/skill-gap/analyze",
    body: { targetRole: "SDE" },
  },
  { method: "GET", path: "/api/v1/india-track" },
  { method: "POST", path: "/api/v1/wellbeing/checkin", body: { mood: 3 } },
  { method: "GET", path: "/api/v1/coach/sessions" },
  { method: "GET", path: "/api/v1/market/weather" },
  { method: "GET", path: "/api/v1/memory" },
  { method: "GET", path: "/api/v1/approvals/pending" },
  { method: "GET", path: "/api/v1/workflows" },
  { method: "PATCH", path: "/api/v1/users/profile", body: { name: "Test User" } },
  {
    method: "POST",
    path: "/api/v1/career-path/simulate",
    body: { targetRole: "Staff Engineer", targetCompany: "Google" },
  },
];

let serverProcess: ChildProcess | null = null;

async function isServerReady(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:3000", { method: "GET" });
    return res.status >= 200;
  } catch {
    return false;
  }
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    if (await isServerReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timed out waiting for Next dev server on localhost:3000");
}

describe("Auth guard — all protected v1 routes return 401 without auth", () => {
  beforeAll(async () => {
    if (await isServerReady()) return;

    serverProcess = spawn("npm run dev", [], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: "3000" },
      shell: true,
      stdio: "ignore",
    });

    await waitForServer();
  }, 70000);

  afterAll(() => {
    if (!serverProcess?.pid) return;

    if (process.platform === "win32") {
      execFileSync("taskkill", ["/pid", String(serverProcess.pid), "/t", "/f"], {
        stdio: "ignore",
      });
      return;
    }

    serverProcess.kill("SIGTERM");
  });

  for (const route of AUTHED_ROUTES) {
    it(`${route.method} ${route.path} → 401`, async () => {
      const init: RequestInit = {
        method: route.method,
        headers: { "Content-Type": "application/json" },
      };
      if (route.body) init.body = JSON.stringify(route.body);

      const res = await fetch(`http://localhost:3000${route.path}`, init);
      expect(res.status).toBe(401);
    }, 15000);
  }
});
