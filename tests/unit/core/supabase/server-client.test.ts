import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const cookieStore = { getAll: vi.fn(), set: vi.fn() };
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));

const createServerClient = vi.fn<(...args: unknown[]) => unknown>(() => ({
  kind: "supabase-client",
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));

const { createSupabaseServerClient } = await import("@/core/supabase/server-client");

interface CookieAdapter {
  getAll: () => unknown;
  setAll: (cookies: { name: string; value: string; options: object }[]) => void;
}

function cookieAdapterPassedToSupabase(): CookieAdapter {
  const options = createServerClient.mock.calls[0]?.[2] as { cookies: CookieAdapter };
  return options.cookies;
}

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_ANON_KEY", "cle-publique");
  });

  it("crée le client avec l'URL et la clé publique de l'environnement", async () => {
    const client = await createSupabaseServerClient();

    expect(client).toEqual({ kind: "supabase-client" });
    expect(createServerClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "cle-publique",
      expect.any(Object),
    );
  });

  it("lit les cookies de session de la requête", async () => {
    cookieStore.getAll.mockReturnValue([{ name: "sb-auth", value: "jeton" }]);
    await createSupabaseServerClient();

    expect(cookieAdapterPassedToSupabase().getAll()).toEqual([{ name: "sb-auth", value: "jeton" }]);
  });

  it("écrit les cookies rafraîchis quand la réponse le permet", async () => {
    await createSupabaseServerClient();
    cookieAdapterPassedToSupabase().setAll([
      { name: "sb-auth", value: "nouveau", options: { httpOnly: true } },
    ]);

    expect(cookieStore.set).toHaveBeenCalledWith("sb-auth", "nouveau", { httpOnly: true });
  });

  it("ignore l'écriture refusée dans un Server Component (le proxy rafraîchit la session)", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });
    await createSupabaseServerClient();

    expect(() =>
      cookieAdapterPassedToSupabase().setAll([{ name: "sb-auth", value: "x", options: {} }]),
    ).not.toThrow();
  });
});
