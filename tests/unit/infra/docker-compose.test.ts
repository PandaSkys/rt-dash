import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

interface ComposeService {
  image?: string;
  ports?: string[];
  read_only?: boolean;
  tmpfs?: string[];
  cap_drop?: string[];
  security_opt?: string[];
  healthcheck?: { test: string[] };
  env_file?: unknown;
}

const compose = parse(readFileSync("docker-compose.yml", "utf8")) as {
  services: Record<string, ComposeService>;
};
const app = compose.services.app!;

describe("docker-compose.yml, service app (design § 16.1, couche 11)", () => {
  it("utilise l'image publiée sur GHCR", () => {
    expect(app.image).toBe("ghcr.io/${GITHUB_OWNER}/rt-dash:${TAG:-latest}");
  });

  it("a un système de fichiers en lecture seule, avec tmpfs pour /tmp et le cache Next", () => {
    expect(app.read_only).toBe(true);
    expect(app.tmpfs).toEqual(expect.arrayContaining(["/tmp", "/app/.next/cache"]));
  });

  it("n'a aucune capacité Linux ni élévation de privilèges", () => {
    expect(app.cap_drop).toEqual(["ALL"]);
    expect(app.security_opt).toContain("no-new-privileges:true");
  });

  it("n'expose aucun port : seul Caddy est joignable", () => {
    expect(app.ports).toBeUndefined();
  });

  it("vérifie sa santé sur /api/health", () => {
    expect(app.healthcheck?.test.join(" ")).toContain("/api/health");
  });
});

describe("docker-compose.yml, service caddy", () => {
  it("est le seul à publier les ports 80 et 443", () => {
    expect(compose.services.caddy?.ports).toEqual(["80:80", "443:443"]);
  });
});

describe("Caddyfile", () => {
  const caddyfile = readFileSync("Caddyfile", "utf8");

  it("sert le domaine configuré et transmet à l'application", () => {
    expect(caddyfile).toContain("{$DOMAIN}");
    expect(caddyfile).toContain("reverse_proxy app:3000");
  });

  it("active HSTS", () => {
    expect(caddyfile).toMatch(/Strict-Transport-Security "max-age=\d+; includeSubDomains"/);
  });
});
