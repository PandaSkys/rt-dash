import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, generateNonce } from "@/core/security/content-security-policy";

describe("buildContentSecurityPolicy", () => {
  const policy = buildContentSecurityPolicy({ nonce: "abc123", isDevelopment: false });

  it("autorise les scripts uniquement avec le nonce", () => {
    expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("unsafe-inline");
  });

  it("interdit l'affichage dans une iframe et les objets", () => {
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("n'autorise unsafe-eval qu'en développement", () => {
    const developmentPolicy = buildContentSecurityPolicy({ nonce: "abc123", isDevelopment: true });

    expect(developmentPolicy).toContain("'unsafe-eval'");
  });

  it("tient sur une seule ligne", () => {
    expect(policy).not.toMatch(/\n/);
  });
});

describe("generateNonce", () => {
  it("produit une valeur différente à chaque appel", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });

  it("produit du base64 sans caractère interdit dans un en-tête", () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
