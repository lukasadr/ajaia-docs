import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAccess } from "@/lib/access";
import { createDocument } from "@/lib/documents";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");

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
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return apiError(401, "UNAUTHORIZED", "Sign in to continue.");

  const document = await createDocument(user.id, "Untitled document", { type: "doc", content: [{ type: "paragraph" }] });
  const access = getAccess(user, document);
  if (access !== "owner") return apiError(403, "FORBIDDEN", "You cannot access this document.");

  const { shares: _shares, ...data } = document;
  return NextResponse.json({ ...data, access }, { status: 201 });
}