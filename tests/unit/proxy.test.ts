// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/core/auth/session-cookie";
import { proxy } from "@/proxy";

function requestTo(path: string, sessionToken?: string): NextRequest {
  const request = new NextRequest(new URL(path, "http://localhost:3000"));
  if (sessionToken) request.cookies.set(SESSION_COOKIE, sessionToken);
  return request;
}

describe("proxy", () => {
  it("renvoie vers /login une page privée demandée sans cookie de session", () => {
    const response = proxy(requestTo("/convois"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("laisse passer une page publique sans session", () => {
    expect(proxy(requestTo("/login")).headers.get("location")).toBeNull();
  });

  it("laisse passer une page privée avec un cookie de session (le serveur le vérifie ensuite)", () => {
    expect(proxy(requestTo("/", "jeton")).headers.get("location")).toBeNull();
  });

  it("pose la CSP, redirection comprise", () => {
    const response = proxy(requestTo("/"));

    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });
});
