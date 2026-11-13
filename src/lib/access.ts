import type { Document, DocumentShare, ShareRole } from "@prisma/client";

export type AccessLevel = "owner" | "editor" | "viewer" | "none";
export type AccessUser = { id: string };
export type AccessDocument = Pick<Document, "id" | "ownerId"> & {
  shares?: Pick<DocumentShare, "userId" | "role">[];
};

export function getAccess(user: AccessUser | null | undefined, doc: AccessDocument): AccessLevel {
  if (!user) return "none";
  if (doc.ownerId === user.id) return "owner";

  const share = doc.shares?.find((entry) => entry.userId === user.id);
  if (!share) return "none";

  return share.role as ShareRole;
}