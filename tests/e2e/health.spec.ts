import { expect, test } from "@playwright/test";

test("GET /api/health répond 200 et confirme que la base répond", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", database: "ok" });
});
