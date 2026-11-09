// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const exchangeCodeForDiscordProfile = vi.fn();
vi.mock("@/core/auth/discord-oauth", () => ({
  exchangeCodeForDiscordProfile: (...args: unknown[]) => exchangeCodeForDiscordProfile(...args),
}));
const openSession = vi.fn();
vi.mock("@/core/db/session-store", () => ({
  openSession: (...args: unknown[]) => openSession(...args),
}));

const { GET } = await import("@/app/auth/callback/route");
const { LOGIN_ATTEMPT_COOKIE, serializeLoginAttempt } = await import("@/core/auth/login-attempt");
const { SESSION_COOKIE } = await import("@/core/auth/session-cookie");

const profile = {
  discordId: "123456789012345678",
  discordUsername: "pseudo_discord",
  discordDisplayName: "Nom",
};

function callback(query: string, withAttemptCookie = true): NextRequest {
  const request = new NextRequest(`http://localhost:3000/auth/callback${query}`);
  if (withAttemptCookie) {
    const attempt = serializeLoginAttempt({ state: "etat", codeVerifier: "verificateur" });
    request.cookies.set(LOGIN_ATTEMPT_COOKIE, attempt);
  }
  return request;
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "http://localhost:3000");
    exchangeCodeForDiscordProfile.mockResolvedValue(profile);
  });

  it("ouvre une session, pose le cookie de session puis ouvre l'accueil", async () => {
    const response = await GET(callback("?code=abc&state=etat"));

    expect(exchangeCodeForDiscordProfile).toHaveBeenCalledWith("abc", "verificateur");
    expect(openSession).toHaveBeenCalledWith(expect.stringMatching(/^[\w-]{43}$/), profile);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(response.cookies.get(SESSION_COOKIE)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("efface le cookie de la tentative de connexion (usage unique)", async () => {
    const response = await GET(callback("?code=abc&state=etat"));

    expect(response.cookies.get(LOGIN_ATTEMPT_COOKIE)).toMatchObject({
      value: "",
      maxAge: 0,
      path: "/",
    });
  });

  it("refuse un state différent de celui du départ (requête forgée)", async () => {
    const response = await GET(callback("?code=abc&state=forge"));

    expect(exchangeCodeForDiscordProfile).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?erreur=connexion");
  });

  it("refuse un retour sans le cookie de départ", async () => {
    const response = await GET(callback("?code=abc&state=etat", false));

    expect(openSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?erreur=connexion");
  });

  it("revient sur /login si Discord refuse le code ou renvoie un profil invalide", async () => {
    exchangeCodeForDiscordProfile.mockResolvedValue(null);
    const response = await GET(callback("?code=abc&state=etat"));

    expect(openSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?erreur=connexion");
  });

  it("revient sur /login si l'utilisateur a refusé sur Discord", async () => {
    const response = await GET(callback("?error=access_denied&state=etat"));

    expect(exchangeCodeForDiscordProfile).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?erreur=connexion");
  });
});
