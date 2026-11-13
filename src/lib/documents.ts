import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createDocument(ownerId: string, title: string, content: Prisma.InputJsonValue) {
  return prisma.document.create({
    data: { ownerId, title, content },
    include: { shares: { select: { userId: true, role: true } } },
  });
}