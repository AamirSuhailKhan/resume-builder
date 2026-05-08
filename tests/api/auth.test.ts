/**
 * Verifies that all AI routes return 401 when called without authentication.
 * This is a regression guard - if auth is accidentally removed, this catches it.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { execFileSync } from "node:child_process";

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

describe("AI routes - unauthenticated requests", () => {
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
      execFileSync("taskkill", ["/pid", String(serverProcess.pid), "/t", "/f"], { stdio: "ignore" });
      return;
    }

    serverProcess.kill("SIGTERM");
  });

  for (const route of AI_ROUTES) {
    it(`${route} returns 401 without session`, async () => {
      const res = await fetch(`http://localhost:3000${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: {}, jobDescription: "test" }),
      });
      expect(res.status).toBe(401);
    }, 15000);
  }
});
