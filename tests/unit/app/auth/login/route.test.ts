// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth/discord-oauth", () => ({
  startDiscordLogin: () => ({
    authorizationUrl: new URL("https://discord.com/oauth2/authorize?state=etat"),
    attempt: { state: "etat", codeVerifier: "verificateur" },
  }),
}));

const { GET } = await import("@/app/auth/login/route");
const { LOGIN_ATTEMPT_COOKIE, readLoginAttempt } = await import("@/core/auth/login-attempt");

describe("GET /auth/login", () => {
  it("envoie vers Discord", async () => {
    const response = GET();

    expect(response.headers.get("location")).toBe(
      "https://discord.com/oauth2/authorize?state=etat",
    );
  });

  it("garde state et code PKCE 10 minutes dans un cookie httpOnly", async () => {
    const cookie = GET().cookies.get(LOGIN_ATTEMPT_COOKIE);

    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 600 });
    expect(readLoginAttempt(cookie?.value, "etat")).toEqual({
      state: "etat",
      codeVerifier: "verificateur",
    });
  });
});
