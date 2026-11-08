// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
let cookieAdapter: {
  setAll: (cookies: { name: string; value: string; options: object }[]) => void;
};
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: typeof cookieAdapter }) => {
    cookieAdapter = options.cookies;
    return { auth: { getClaims } };
  },
}));

const { proxy } = await import("@/proxy");

function requestTo(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function signedIn() {
  getClaims.mockResolvedValue({ data: { claims: { sub: "utilisateur" } }, error: null });
}

function signedOut() {
  getClaims.mockResolvedValue({ data: null, error: null });
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("SUPABASE_ANON_KEY", "cle-publique");
  });

  it("redirige vers /login une page privée demandée sans session", async () => {
    signedOut();
    const response = await proxy(requestTo("/convois"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("laisse passer une page publique sans session", async () => {
    signedOut();
    const response = await proxy(requestTo("/login"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("laisse passer une page privée avec une session valide", async () => {
    signedIn();
    const response = await proxy(requestTo("/"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("pose la CSP sur la réponse, redirection comprise", async () => {
    signedOut();
    const response = await proxy(requestTo("/"));

    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("renvoie au navigateur les cookies de session rafraîchis, même en cas de redirection", async () => {
    getClaims.mockImplementation(async () => {
      cookieAdapter.setAll([{ name: "sb-auth", value: "", options: { maxAge: 0 } }]);
      return { data: null, error: null };
    });
    const response = await proxy(requestTo("/convois"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(response.cookies.get("sb-auth")).toMatchObject({ value: "" });
  });
});
