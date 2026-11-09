import { type NextRequest, NextResponse } from "next/server";
import { isPublicPath } from "@/core/auth/public-paths";
import { SESSION_COOKIE } from "@/core/auth/session-cookie";
import { buildContentSecurityPolicy, generateNonce } from "@/core/security/content-security-policy";

// Sans cookie de session, renvoie vers /login. Ne valide PAS la session et ne vérifie PAS
// les rôles : chaque page et chaque action le refait côté serveur (design § 5.3).
export function proxy(request: NextRequest) {
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce: generateNonce(),
    isDevelopment: process.env.NODE_ENV === "development",
  });

  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);
  const response =
    hasSessionCookie || isPublicPath(request.nextUrl.pathname)
      ? continueWithPolicy(request, contentSecurityPolicy)
      : NextResponse.redirect(new URL("/login", request.url));

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

function continueWithPolicy(request: NextRequest, contentSecurityPolicy: string): NextResponse {
  // Next.js lit la CSP de la requête pour poser le nonce sur ses propres scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    {
      // Les fichiers publics (logos de /login) restent accessibles sans session.
      source: "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
