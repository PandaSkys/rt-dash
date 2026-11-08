// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeAuthCode = vi.fn();
vi.mock("@/core/supabase/auth-session", () => ({
  exchangeAuthCode: (...args: unknown[]) => exchangeAuthCode(...args),
}));

const { GET } = await import("@/app/auth/callback/route");

function callback(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/auth/callback${query}`);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "http://localhost:3000");
  });

  it("échange le code contre une session puis ouvre l'accueil", async () => {
    exchangeAuthCode.mockResolvedValue(true);
    const response = await GET(callback("?code=abc"));

    expect(exchangeAuthCode).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("revient sur /login avec un message si l'échange échoue", async () => {
    exchangeAuthCode.mockResolvedValue(false);
    const response = await GET(callback("?code=abc"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?erreur=connexion");
  });

  it("revient sur /login sans rien demander à Supabase si Discord n'a pas donné de code", async () => {
    const response = await GET(callback("?error=access_denied"));

    expect(exchangeAuthCode).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?erreur=connexion");
  });
});
