import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const auth = {
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
};
vi.mock("@/core/supabase/server-client", () => ({
  createSupabaseServerClient: async () => ({ auth }),
}));

const { exchangeAuthCode, getSessionUser, signOutCurrentUser, startDiscordSignIn } =
  await import("@/core/supabase/auth-session");

describe("auth-session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("startDiscordSignIn demande Discord avec le seul scope identify (design § 5.1)", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://discord.com/x" }, error: null });

    const url = await startDiscordSignIn("http://localhost:3000/auth/callback");

    expect(url).toBe("https://discord.com/x");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "discord",
      options: { redirectTo: "http://localhost:3000/auth/callback", scopes: "identify" },
    });
  });

  it("startDiscordSignIn renvoie null si Supabase refuse", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: new Error("refus") });

    expect(await startDiscordSignIn("http://localhost:3000/auth/callback")).toBeNull();
  });

  it("exchangeAuthCode dit si le code a donné une session", async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("code expiré") });

    expect(await exchangeAuthCode("bon")).toBe(true);
    expect(await exchangeAuthCode("expiré")).toBe(false);
  });

  it("signOutCurrentUser ferme la session", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await signOutCurrentUser();

    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it("getSessionUser valide le jeton auprès de Supabase et renvoie null sans session", async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });
    auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("pas de session"),
    });

    expect(await getSessionUser()).toEqual({ id: "u1" });
    expect(await getSessionUser()).toBeNull();
  });
});
