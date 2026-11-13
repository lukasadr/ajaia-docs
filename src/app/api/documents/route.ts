import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.json().default({}),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.document.findMany({
    where: { OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }] },
    include: { shares: { select: { userId: true, role: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const accessible = documents.flatMap((document) => {
    const access = getAccess(user, document);
    return access === "none" ? [] : [{ ...document, access }];
  });

  return NextResponse.json(accessible);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const document = await prisma.document.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      content: parsed.data.content === null ? Prisma.JsonNull : parsed.data.content as Prisma.InputJsonValue,
    },
    include: { shares: { select: { userId: true, role: true } } },
  });
  const access = getAccess(user, document);
  if (access !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ ...document, access }, { status: 201 });
}