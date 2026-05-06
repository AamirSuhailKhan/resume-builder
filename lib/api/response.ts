import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { QueueUnavailableError } from "@/lib/errors";

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, { status });
}

export function apiError(error: string, status: number) {
  return NextResponse.json<ApiResponse<null>>({ data: null, error }, { status });
}

export function errorToResponse(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return apiError("Please sign in to continue.", 401);
  }

  if (error instanceof ZodError) {
    console.warn("[API VALIDATION ERROR]", error.flatten());
    return apiError("Invalid request payload.", 400);
  }

  if (error instanceof QueueUnavailableError) {
    console.error("[API QUEUE ERROR]", error);
    return apiError("Background queue is unavailable. Check Redis and worker health.", 503);
  }

  console.error("[API ERROR]", error);
  return apiError("Something went wrong. Please try again.", 500);
}
