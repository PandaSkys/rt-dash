// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSupabaseReachable } from "@/core/supabase/supabase-health";

const fetchMock = vi.fn();

describe("isSupabaseReachable", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_ANON_KEY", "cle-publique");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("interroge le point de santé de Supabase Auth avec la clé publique", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    expect(await isSupabaseReachable()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:54321/auth/v1/health",
      expect.objectContaining({ headers: { apikey: "cle-publique" } }),
    );
  });

  it("répond non si Supabase renvoie une erreur", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));

    expect(await isSupabaseReachable()).toBe(false);
  });

  it("répond non si Supabase est injoignable ou trop lent", async () => {
    fetchMock.mockRejectedValue(new Error("délai dépassé"));

    expect(await isSupabaseReachable()).toBe(false);
  });
});
