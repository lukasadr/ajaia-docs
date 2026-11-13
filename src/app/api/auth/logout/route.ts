import { NextResponse } from "next/server";
import { apiError, sessionState } from "@/lib/api";
import { clearSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { user, response } = await sessionState();
    if (response) return response;
    if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");
    await clearSession();
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to sign out right now.");
  }
}