import { z } from "zod";
import { getAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const shareRoleSchema = z.enum(["viewer", "editor"]);
export const shareEmailSchema = z.string().trim().email();

export class ShareServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ShareServiceError";
  }
}

async function requireOwner(ownerId: string, docId: string) {
  const document = await prisma.document.findUnique({
    where: { id: docId },
    include: { shares: { select: { userId: true, role: true } } },
  });
  if (!document) throw new ShareServiceError("NOT_FOUND", "Document not found.");

  const access = getAccess({ id: ownerId }, document);
  if (access === "none") throw new ShareServiceError("NOT_FOUND", "Document not found.");
  if (access !== "owner") throw new ShareServiceError("FORBIDDEN", "Only the owner can manage sharing.");
  return document;
}

export async function shareDocument(ownerId: string, docId: string, email: string, role: "viewer" | "editor") {
  await requireOwner(ownerId, docId);
  const parsedEmail = shareEmailSchema.safeParse(email);
  const parsedRole = shareRoleSchema.safeParse(role);
  if (!parsedEmail.success) throw new ShareServiceError("INVALID_EMAIL", "Enter a valid email address.");
  if (!parsedRole.success) throw new ShareServiceError("INVALID_ROLE", "Role must be viewer or editor.");

  const user = await prisma.user.findUnique({ where: { email: parsedEmail.data.toLowerCase() } });
  if (!user) throw new ShareServiceError("UNKNOWN_USER", "No existing user has that email address.");
  if (user.id === ownerId) throw new ShareServiceError("OWNER_SHARE", "You already own this document.");

  return prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: docId, userId: user.id } },
    create: { documentId: docId, userId: user.id, role: parsedRole.data },
    update: { role: parsedRole.data },
    select: { documentId: true, userId: true, role: true },
  });
}

export async function unshareDocument(ownerId: string, docId: string, userId: string) {
  await requireOwner(ownerId, docId);
  await prisma.documentShare.deleteMany({ where: { documentId: docId, userId } });
}

export async function listShares(ownerId: string, docId: string) {
  await requireOwner(ownerId, docId);
  return prisma.documentShare.findMany({
    where: { documentId: docId },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}