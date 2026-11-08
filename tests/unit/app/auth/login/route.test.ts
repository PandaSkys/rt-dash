// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const startDiscordSignIn = vi.fn();
vi.mock("@/core/supabase/auth-session", () => ({
  startDiscordSignIn: (...args: unknown[]) => startDiscordSignIn(...args),
}));

const { GET } = await import("@/app/auth/login/route");

describe("GET /auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "http://localhost:3000");
  });

  it("demande à Supabase un retour vers /auth/callback, puis envoie vers Discord", async () => {
    startDiscordSignIn.mockResolvedValue("https://discord.com/api/oauth2/authorize?x=1");
    const response = await GET();

    expect(startDiscordSignIn).toHaveBeenCalledWith("http://localhost:3000/auth/callback");
    expect(response.headers.get("location")).toBe("https://discord.com/api/oauth2/authorize?x=1");
  });

  it("revient sur /login avec un message si Supabase refuse", async () => {
    startDiscordSignIn.mockResolvedValue(null);
    const response = await GET();

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?erreur=connexion");
  });
});
