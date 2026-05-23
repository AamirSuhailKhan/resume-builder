import { PrismaClient } from "@prisma/client";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import * as fs from "fs";
import * as path from "path";

// Manually load env variables from .env.local
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match && match[1] && match[2]) {
        const key = match[1].trim();
        let val = match[2].trim();
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn("Could not load .env.local", e);
}

// Ensure DATABASE_URL is set in local env for Prisma
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const dbUrl: string = databaseUrl;

// Map GEMINI_API_KEY to GOOGLE_GENERATIVE_AI_API_KEY for `@ai-sdk/google`
if (process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
}

import { buildCoachSystemPrompt } from "../lib/coach-context";

const prisma = new PrismaClient();

async function test() {
  console.log("⚡ Starting Career Coach Integration Test...");
  console.log(`📡 Database URL loaded: ${dbUrl.split("@").pop()}`);

  try {
    // 1. Check database connection and users
    const user = await prisma.user.findFirst({
      where: { email: "demo@career-os.ai" },
    });

    if (!user) {
      console.error("❌ Demo user 'demo@career-os.ai' not found in database. Run the database seed first.");
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (Plan: ${user.plan})`);

    // 2. Build system prompt
    console.log("🔄 Building Career Coach system prompt...");
    const systemPrompt = await buildCoachSystemPrompt(user.id, {
      mode: "chat",
    });
    console.log("✅ System prompt successfully generated! Preview:");
    console.log("--------------------------------------------------");
    console.log(systemPrompt.slice(0, 500) + "...\n[TRUNCATED]");
    console.log("--------------------------------------------------");

    // 3. Test Gemini Call using `@ai-sdk/google`
    console.log("🤖 Calling Google Gemini (gemini-2.0-flash) with the prompt...");
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY is not set in environment.");
      process.exit(1);
    }
    
    const response = await streamText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: "Hi Coach, why am I getting rejected from senior roles? Can you summarize my resume alignment?",
        },
      ],
      maxOutputTokens: 256,
    });

    console.log("Streaming response from Gemini:");
    console.log("==================================================");
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
    }
    console.log("\n==================================================");
    console.log("✅ Success! Gemini connection and AI Career Coach stream are fully functional!");
  } catch (err) {
    console.error("❌ Gemini Call failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
