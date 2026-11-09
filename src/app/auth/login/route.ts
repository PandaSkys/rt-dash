import { NextResponse } from "next/server";
import { startDiscordLogin } from "@/core/auth/discord-oauth";
import {
  LOGIN_ATTEMPT_COOKIE,
  LOGIN_ATTEMPT_MAX_AGE_SECONDS,
  serializeLoginAttempt,
} from "@/core/auth/login-attempt";
import { PRIVATE_COOKIE_OPTIONS } from "@/core/auth/session-cookie";

// Lien simple (GET) et non formulaire : la CSP « form-action 'self' » bloquerait la
// redirection d'un formulaire vers Discord.
export function GET() {
  const { authorizationUrl, attempt } = startDiscordLogin();
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(LOGIN_ATTEMPT_COOKIE, serializeLoginAttempt(attempt), {
    ...PRIVATE_COOKIE_OPTIONS,
    maxAge: LOGIN_ATTEMPT_MAX_AGE_SECONDS,
  });
  return response;
}
