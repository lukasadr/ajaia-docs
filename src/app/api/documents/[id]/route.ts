import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.json().optional(),
}).refine((value) => value.title !== undefined || value.content !== undefined, {
  message: "Provide a title or content to update.",
});

async function findDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const document = await findDocument(id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const access = getAccess(user, document);
  if (access === "none") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ ...document, access });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const document = await findDocument(id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const access = getAccess(user, document);
  if (access !== "owner" && access !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.content !== undefined
        ? { content: parsed.data.content === null ? Prisma.JsonNull : parsed.data.content as Prisma.InputJsonValue }
        : {}),
    },
    include: { shares: { select: { userId: true, role: true } } },
  });
  return NextResponse.json({ ...updated, access: getAccess(user, updated) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const document = await findDocument(id);
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const access = getAccess(user, document);
  if (access !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.document.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}