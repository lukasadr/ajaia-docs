import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson, sessionState } from "@/lib/api";
import { getAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.json().optional(),
}).refine((value) => value.title !== undefined || value.content !== undefined, {
  message: "Provide a title or content to update.",
});
const idSchema = z.string().cuid();

async function findDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { user, response } = await sessionState();
  if (response) return response;
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return apiError(404, "NOT_FOUND", "Document not found.");
  try {
    const document = await findDocument(parsedId.data);
    if (!document) return apiError(404, "NOT_FOUND", "Document not found.");

    const access = getAccess(user, document);
    if (access === "none") return apiError(404, "NOT_FOUND", "Document not found.");
    const { shares: _shares, ...data } = document;
    return NextResponse.json({ ...data, access });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to load this document right now.");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, response } = await sessionState();
  if (response) return response;
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return apiError(404, "NOT_FOUND", "Document not found.");
  try {
    const document = await findDocument(parsedId.data);
    if (!document) return apiError(404, "NOT_FOUND", "Document not found.");

    const access = getAccess(user, document);
    if (access === "none") return apiError(404, "NOT_FOUND", "Document not found.");
    if (access === "viewer") return apiError(403, "FORBIDDEN", "Viewers cannot edit this document.");

    const parsed = await parseJson(request, updateDocumentSchema);
    if (!parsed.success) return parsed.response;

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
    const { shares: _shares, ...data } = updated;
    return NextResponse.json({ ...data, access: getAccess(user, updated) });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to update this document right now.");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, response } = await sessionState();
  if (response) return response;
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");
  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return apiError(404, "NOT_FOUND", "Document not found.");
  try {
    const document = await findDocument(parsedId.data);
    if (!document) return apiError(404, "NOT_FOUND", "Document not found.");

    const access = getAccess(user, document);
    if (access === "none") return apiError(404, "NOT_FOUND", "Document not found.");
    if (access !== "owner") return apiError(403, "FORBIDDEN", "Only the owner can delete this document.");
    await prisma.document.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to delete this document right now.");
  }
}