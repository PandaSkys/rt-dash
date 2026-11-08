// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutCurrentUser = vi.fn();
vi.mock("@/core/supabase/auth-session", () => ({
  signOutCurrentUser: () => signOutCurrentUser(),
}));

const { POST } = await import("@/app/auth/logout/route");

describe("POST /auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "http://localhost:3000");
  });

  it("ferme la session puis renvoie vers /login", async () => {
    const response = await POST();

    expect(signOutCurrentUser).toHaveBeenCalledOnce();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
