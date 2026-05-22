import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { QueueUnavailableError, AppError } from "@/lib/errors";
import { Prisma } from "@prisma/client";

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
};

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null }, { status });
}

export function apiError(error: string, status: number, code = "BAD_REQUEST", details?: unknown) {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message: error,
      details,
    },
  };
  return NextResponse.json(payload, { status });
}

export function errorToResponse(error: unknown) {
  if (error instanceof AppError) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
    if (process.env.NODE_ENV !== "production") {
      payload.error.stack = error.stack;
    }
    return NextResponse.json(payload, { status: error.statusCode });
  }

  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return apiError("Please sign in to continue.", 401, "UNAUTHENTICATED");
  }

  if (error instanceof ZodError) {
    console.warn("[API VALIDATION ERROR]", error.flatten());
    return apiError("Invalid request payload.", 400, "VALIDATION_ERROR", error.flatten());
  }

  if (error instanceof QueueUnavailableError) {
    console.error("[API QUEUE ERROR]", error);
    return apiError("Background queue is unavailable. Check Redis and worker health.", 503, "QUEUE_UNAVAILABLE");
  }

  // Handle Prisma initialization errors specifically
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[PRISMA INIT ERROR]", error);
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: "DATABASE_CONNECTION_ERROR",
        message: "Failed to connect to the database.",
      },
    };
    if (process.env.NODE_ENV !== "production") {
      payload.error.stack = error.stack;
      payload.error.details = error.message;
    }
    return NextResponse.json(payload, { status: 500 });
  }

  console.error("[API ERROR]", error);
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
  
  if (error instanceof Error && process.env.NODE_ENV !== "production") {
    payload.error.details = error.message;
    payload.error.stack = error.stack;
  }

  return NextResponse.json(payload, { status: 500 });
}
