import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getSessionUser: vi.fn(),
  createSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock("@/lib/session", () => ({
  getSessionUser: mocks.getSessionUser,
  createSession: mocks.createSession,
  clearSession: mocks.clearSession,
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";

describe("auth route hardening", () => {
  it("returns structured validation errors for malformed login input", async () => {
    const response = await login(new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "unexpected=value",
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR", message: expect.any(String) } });
  });

  it("requires a session to log out and returns the structured 401 envelope", async () => {
    mocks.getSessionUser.mockResolvedValueOnce(null);
    const response = await logout(new Request("http://localhost/api/auth/logout", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it("returns a structured 500 when the login user lookup fails", async () => {
    mocks.findUnique.mockRejectedValueOnce(new Error("database unavailable"));
    const body = new FormData();
    body.set("userId", "demo-user");
    const response = await login(new Request("http://localhost/api/auth/login", { method: "POST", body }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR", message: expect.any(String) } });
  });
});