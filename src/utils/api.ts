import { NextResponse } from "next/server";
import type { ApiError } from "@/types";

export function apiError(error: string, code: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error, code }, { status });
}

export function unauthorized() {
  return apiError("Unauthorized", "UNAUTHORIZED", 401);
}

export function badRequest(message: string) {
  return apiError(message, "VALIDATION_ERROR", 400);
}

export function internalError() {
  return apiError("Internal server error", "INTERNAL_ERROR", 500);
}
