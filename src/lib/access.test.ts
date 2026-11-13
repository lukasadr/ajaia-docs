import { describe, expect, it } from "vitest";
import { getAccess } from "@/lib/access";

const document = {
  id: "doc-1",
  ownerId: "user-owner",
  shares: [
    { userId: "user-editor", role: "editor" as const },
    { userId: "user-viewer", role: "viewer" as const },
  ],
};

describe("getAccess", () => {
  it("returns owner for the document owner", () => {
    expect(getAccess({ id: "user-owner" }, document)).toBe("owner");
  });

  it("returns editor for an editor share", () => {
    expect(getAccess({ id: "user-editor" }, document)).toBe("editor");
  });

  it("returns viewer for a viewer share", () => {
    expect(getAccess({ id: "user-viewer" }, document)).toBe("viewer");
  });

  it("returns none for an unrelated user", () => {
    expect(getAccess({ id: "user-other" }, document)).toBe("none");
  });
});