import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  documentId: "cmweujca50001yiu6zy69jpc9",
  users: [
    { id: "owner", email: "owner@example.com", name: "Owner" },
    { id: "user-b", email: "b@example.com", name: "User B" },
    { id: "user-c", email: "c@example.com", name: "User C" },
  ],
  documents: [{ id: "cmweujca50001yiu6zy69jpc9", ownerId: "owner", title: "Doc", content: { type: "doc" }, shares: [] as { userId: string; role: "viewer" | "editor" }[] }],
  shares: [] as { documentId: string; userId: string; role: "viewer" | "editor" }[],
  currentUserId: "owner",
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const document = state.documents.find((item) => item.id === where.id);
        return document ? { ...document, shares: state.shares.filter((share) => share.documentId === document.id) } : null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const document = state.documents.find((item) => item.id === where.id)!;
        Object.assign(document, data);
        return { ...document, shares: state.shares.filter((share) => share.documentId === document.id) };
      }),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) => state.users.find((item) => item.email === where.email) ?? null),
    },
    documentShare: {
      upsert: vi.fn(async ({ where, create, update }: { where: { documentId_userId: { documentId: string; userId: string } }; create: { documentId: string; userId: string; role: "viewer" | "editor" }; update: { role: "viewer" | "editor" } }) => {
        const key = where.documentId_userId;
        const existing = state.shares.find((item) => item.documentId === key.documentId && item.userId === key.userId);
        if (existing) existing.role = update.role;
        else state.shares.push({ ...create });
        return state.shares.find((item) => item.documentId === key.documentId && item.userId === key.userId)!;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { documentId: string; userId: string } }) => {
        const before = state.shares.length;
        state.shares = state.shares.filter((share) => share.documentId !== where.documentId || share.userId !== where.userId);
        return { count: before - state.shares.length };
      }),
      findMany: vi.fn(async ({ where }: { where: { documentId: string } }) => state.shares.filter((share) => share.documentId === where.documentId).map((share) => ({
        userId: share.userId,
        role: share.role,
        user: (() => {
          const user = state.users.find((item) => item.id === share.userId);
          return user ? { name: user.name, email: user.email } : undefined;
        })(),
      }))),
    },
  },
}));

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => state.users.find((user) => user.id === state.currentUserId) ?? null),
}));

import { getAccess } from "@/lib/access";
import { GET, PATCH } from "@/app/api/documents/[id]/route";
import { listShares, shareDocument, ShareServiceError, unshareDocument } from "@/lib/sharing";

describe("document sharing flow", () => {
  beforeEach(() => {
    state.shares = [];
    state.currentUserId = "owner";
    state.documents[0] = { id: state.documentId, ownerId: "owner", title: "Doc", content: { type: "doc" }, shares: [] };
  });

  it("grants read-only access, rejects viewer PATCH, allows editor PATCH, then revokes access", async () => {
    expect(getAccess({ id: "user-b" }, state.documents[0])).toBe("none");

    await shareDocument("owner", state.documentId, "b@example.com", "viewer");
    expect(getAccess({ id: "user-b" }, { ...state.documents[0], shares: state.shares })).toBe("viewer");

    state.currentUserId = "user-b";
    const readResponse = await GET(
      new Request(`http://localhost/api/documents/${state.documentId}`),
      { params: Promise.resolve({ id: state.documentId }) },
    );
    expect(readResponse.status).toBe(200);
    expect(await readResponse.json()).toMatchObject({ access: "viewer", title: "Doc" });

    const viewerResponse = await PATCH(
      new Request(`http://localhost/api/documents/${state.documentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Blocked" }) }),
      { params: Promise.resolve({ id: state.documentId }) },
    );
    expect(viewerResponse.status).toBe(403);

    state.currentUserId = "owner";
    await shareDocument("owner", state.documentId, "b@example.com", "editor");
    state.currentUserId = "user-b";
    const editorResponse = await PATCH(
      new Request(`http://localhost/api/documents/${state.documentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Edited" }) }),
      { params: Promise.resolve({ id: state.documentId }) },
    );
    expect(editorResponse.status).toBe(200);
    expect(state.documents[0].title).toBe("Edited");

    await unshareDocument("owner", state.documentId, "user-b");
    expect(getAccess({ id: "user-b" }, { ...state.documents[0], shares: state.shares })).toBe("none");
  });

  it("rejects sharing by a non-owner", async () => {
    await shareDocument("owner", state.documentId, "b@example.com", "viewer");
    await expect(shareDocument("user-b", state.documentId, "c@example.com", "editor"))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects sharing with the owner and unknown or invalid emails", async () => {
    await expect(shareDocument("owner", state.documentId, "owner@example.com", "viewer"))
      .rejects.toMatchObject({ code: "OWNER_SHARE" });
    await expect(shareDocument("owner", state.documentId, "missing@example.com", "viewer"))
      .rejects.toMatchObject({ code: "UNKNOWN_USER" });
    await expect(shareDocument("owner", state.documentId, "not-an-email", "viewer"))
      .rejects.toMatchObject({ code: "INVALID_EMAIL" });
  });

  it("lists collaborators with their names and roles", async () => {
    await shareDocument("owner", state.documentId, "b@example.com", "viewer");
    await expect(listShares("owner", state.documentId)).resolves.toEqual([
      { userId: "user-b", role: "viewer", user: { email: "b@example.com", name: "User B" } },
    ]);
  });

  it("uses 404 for no-access document and 403 for a collaborator managing sharing", async () => {
    await expect(unshareDocument("user-c", state.documentId, "user-b"))
      .rejects.toBeInstanceOf(ShareServiceError);
    await shareDocument("owner", state.documentId, "b@example.com", "viewer");
    await expect(listShares("user-b", state.documentId))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listShares("user-c", state.documentId))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});