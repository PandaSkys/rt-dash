import { type NextRequest, NextResponse } from "next/server";
import { isPublicPath } from "@/core/auth/public-paths";
import { buildContentSecurityPolicy, generateNonce } from "@/core/security/content-security-policy";
import { refreshSession } from "@/core/supabase/session-proxy";

// Rafraîchit la session et renvoie vers /login sans session. Ne vérifie PAS les rôles :
// chaque page et chaque action le refait côté serveur (design § 5.3).
export async function proxy(request: NextRequest) {
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce: generateNonce(),
    isDevelopment: process.env.NODE_ENV === "development",
  });

  // Next.js lit la CSP de la requête pour poser le nonce sur ses propres scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const { response, isSignedIn } = await refreshSession(request, requestHeaders);
  const finalResponse =
    isSignedIn || isPublicPath(request.nextUrl.pathname)
      ? response
      : redirectToLogin(request, response);

  finalResponse.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return finalResponse;
}

function redirectToLogin(request: NextRequest, sessionResponse: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(new URL("/login", request.url));
  for (const cookie of sessionResponse.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
