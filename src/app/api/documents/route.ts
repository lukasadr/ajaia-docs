import { NextResponse } from "next/server";
import { apiError, sessionState } from "@/lib/api";
import { getAccess } from "@/lib/access";
import { createDocument } from "@/lib/documents";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await sessionState();
  if (response) return response;
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");

  try {
    const documents = await prisma.document.findMany({
      where: { OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }] },
      include: { shares: { select: { userId: true, role: true } }, owner: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    const accessible = documents.flatMap((document) => {
      const access = getAccess(user, document);
      const { shares: _shares, owner, ...data } = document;
      return access === "none" ? [] : [{ ...data, access, ...(access !== "owner" ? { sharedBy: owner.name } : {}) }];
    });

    return NextResponse.json(accessible);
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to load documents right now.");
  }
}

export async function POST() {
  const { user, response } = await sessionState();
  if (response) return response;
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");

  try {
    const document = await createDocument(user.id, "Untitled document", { type: "doc", content: [{ type: "paragraph" }] });
    const access = getAccess(user, document);
    if (access !== "owner") return apiError(500, "CREATE_FAILED", "The document could not be created.");

    const { shares: _shares, ...data } = document;
    return NextResponse.json({ ...data, access }, { status: 201 });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "Unable to create a document right now.");
  }
}