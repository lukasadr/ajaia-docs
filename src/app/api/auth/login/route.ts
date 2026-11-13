import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError(400, "INVALID_FORM_DATA", "Submit a valid login form.");
  }
  const parsed = loginSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Select a valid demo user.");

  try {
    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } });
    if (!user) return apiError(404, "NOT_FOUND", "Demo user not found.");

    await createSession(user.id);
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to sign in right now.");
  }
}