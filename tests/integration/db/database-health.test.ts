import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getDatabase } = await import("@/core/db/client");
const { isDatabaseReachable } = await import("@/core/db/database-health");

afterAll(() => getDatabase().destroy());

describe("isDatabaseReachable", () => {
  it("répond oui quand la base locale tourne", async () => {
    expect(await isDatabaseReachable()).toBe(true);
  });
});
