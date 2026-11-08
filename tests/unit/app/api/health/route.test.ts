import { beforeEach, describe, expect, it, vi } from "vitest";

const isSupabaseReachable = vi.fn();
vi.mock("@/core/supabase/supabase-health", () => ({
  isSupabaseReachable: () => isSupabaseReachable(),
}));

const { GET } = await import("@/app/api/health/route");

describe("GET /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("répond 200 quand Supabase répond", async () => {
    isSupabaseReachable.mockResolvedValue(true);
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", supabase: "ok" });
  });

  it("répond 503 quand Supabase est injoignable", async () => {
    isSupabaseReachable.mockResolvedValue(false);
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", supabase: "unreachable" });
  });
});
