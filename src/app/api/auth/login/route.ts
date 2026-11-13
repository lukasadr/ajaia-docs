import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid user selection." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await createSession(user.id);
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}