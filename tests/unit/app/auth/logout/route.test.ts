// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const closeSession = vi.fn();
vi.mock("@/core/db/session-store", () => ({
  closeSession: (token: string) => closeSession(token),
}));

const { POST } = await import("@/app/auth/logout/route");
const { SESSION_COOKIE } = await import("@/core/auth/session-cookie");

function logout(withSession: boolean): NextRequest {
  const request = new NextRequest("http://localhost:3000/auth/logout", { method: "POST" });
  if (withSession) request.cookies.set(SESSION_COOKIE, "jeton-de-session");
  return request;
}

describe("POST /auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "http://localhost:3000");
  });

  it("ferme la session en base, efface le cookie puis renvoie vers /login", async () => {
    const response = await POST(logout(true));

    expect(closeSession).toHaveBeenCalledWith("jeton-de-session");
    expect(response.cookies.get(SESSION_COOKIE)).toMatchObject({
      value: "",
      maxAge: 0,
      secure: true,
      path: "/",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("sans session, renvoie simplement vers /login", async () => {
    const response = await POST(logout(false));

    expect(closeSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
