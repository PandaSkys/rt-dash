// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generateSessionToken } from "@/core/auth/session-token";

describe("generateSessionToken", () => {
  it("produit 32 octets aléatoires en base64url (43 caractères, sans caractère spécial)", () => {
    expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("ne produit jamais deux fois le même jeton", () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateSessionToken));

    expect(tokens.size).toBe(1000);
  });
});
