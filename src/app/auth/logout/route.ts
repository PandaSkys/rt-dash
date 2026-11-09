import { type NextRequest, NextResponse } from "next/server";
import { loginUrl } from "@/core/auth/auth-urls";
import { EXPIRED_COOKIE_OPTIONS, SESSION_COOKIE } from "@/core/auth/session-cookie";
import { closeSession } from "@/core/db/session-store";

// POST uniquement : un lien ou une image ne peut pas déconnecter l'utilisateur.
export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) await closeSession(sessionToken);

  const response = NextResponse.redirect(loginUrl(), 303);
  response.cookies.set(SESSION_COOKIE, "", EXPIRED_COOKIE_OPTIONS);
  return response;
}
