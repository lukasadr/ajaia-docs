import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const emptyDocument = { type: "doc", content: [{ type: "paragraph" }] };

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

  const document = await prisma.document.create({
    data: {
      ownerId: user.id,
      title: "Untitled document",
      content: emptyDocument as Prisma.InputJsonValue,
    },
    include: { shares: { select: { userId: true, role: true } } },
  });
  const access = getAccess(user, document);
  if (access !== "owner") return apiError(403, "FORBIDDEN", "You cannot access this document.");

  const { shares: _shares, ...data } = document;
  return NextResponse.json({ ...data, access }, { status: 201 });
}