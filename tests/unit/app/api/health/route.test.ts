import { beforeEach, describe, expect, it, vi } from "vitest";

const isDatabaseReachable = vi.fn();
vi.mock("@/core/db/database-health", () => ({
  isDatabaseReachable: () => isDatabaseReachable(),
}));

const { GET } = await import("@/app/api/health/route");

describe("GET /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("répond 200 quand la base répond", async () => {
    isDatabaseReachable.mockResolvedValue(true);
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "ok" });
  });

  it("répond 503 quand la base est injoignable", async () => {
    isDatabaseReachable.mockResolvedValue(false);
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", database: "unreachable" });
  });
});
