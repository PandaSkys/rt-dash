import { type NextRequest, NextResponse } from "next/server";
import { homeUrl, loginFailedUrl } from "@/core/auth/auth-urls";
import { exchangeCodeForDiscordProfile } from "@/core/auth/discord-oauth";
import { LOGIN_ATTEMPT_COOKIE, readLoginAttempt } from "@/core/auth/login-attempt";
import {
  EXPIRED_COOKIE_OPTIONS,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/core/auth/session-cookie";
import { generateSessionToken } from "@/core/auth/session-token";
import { openSession } from "@/core/db/session-store";

async function openSessionFromDiscord(request: NextRequest): Promise<string | null> {
  const query = request.nextUrl.searchParams;
  const attempt = readLoginAttempt(
    request.cookies.get(LOGIN_ATTEMPT_COOKIE)?.value,
    query.get("state"),
  );
  const code = query.get("code");
  if (!attempt || !code) return null;

  const profile = await exchangeCodeForDiscordProfile(code, attempt.codeVerifier);
  if (!profile) return null;

  const sessionToken = generateSessionToken();
  await openSession(sessionToken, profile);
  return sessionToken;
}

export async function GET(request: NextRequest) {
  const sessionToken = await openSessionFromDiscord(request);
  const response = NextResponse.redirect(sessionToken ? homeUrl() : loginFailedUrl());
  // La tentative ne sert qu'une fois, réussie ou non.
  response.cookies.set(LOGIN_ATTEMPT_COOKIE, "", EXPIRED_COOKIE_OPTIONS);
  if (sessionToken) response.cookies.set(SESSION_COOKIE, sessionToken, SESSION_COOKIE_OPTIONS);
  return response;
}
