import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  console.log("[AUTH ROUTE] GET hit:", req.url);
  try {
    return await handlers.GET(req);
  } catch (error) {
    console.error("[AUTH ROUTE] GET failed", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  console.log("[AUTH ROUTE] POST hit:", req.url);
  try {
    return await handlers.POST(req);
  } catch (error) {
    console.error("[AUTH ROUTE] POST failed", error);
    throw error;
  }
}
