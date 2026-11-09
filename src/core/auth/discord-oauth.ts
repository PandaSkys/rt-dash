import "server-only";
import { Discord, generateCodeVerifier, generateState } from "arctic";
import type { DiscordProfile } from "@/core/auth/discord-profile";
import { parseDiscordUser } from "@/core/auth/discord-user";
import type { LoginAttempt } from "@/core/auth/login-attempt";
import { readAppUrl } from "@/core/config/app-url";
import { readRequiredEnv } from "@/core/config/read-required-env";

const DISCORD_SCOPES = ["identify"]; // ni e-mail ni autre donnée (design § 5.1)
const DISCORD_USER_URL = "https://discord.com/api/users/@me";
const DISCORD_TIMEOUT_MS = 10_000;

function discordClient(): Discord {
  return new Discord(
    readRequiredEnv(process.env, "DISCORD_CLIENT_ID"),
    readRequiredEnv(process.env, "DISCORD_CLIENT_SECRET"),
    `${readAppUrl()}/auth/callback`,
  );
}

export function startDiscordLogin(): { authorizationUrl: URL; attempt: LoginAttempt } {
  const attempt = { state: generateState(), codeVerifier: generateCodeVerifier() };
  const authorizationUrl = discordClient().createAuthorizationURL(
    attempt.state,
    attempt.codeVerifier,
    DISCORD_SCOPES,
  );
  return { authorizationUrl, attempt };
}

async function fetchDiscordUser(accessToken: string): Promise<DiscordProfile | null> {
  const response = await fetch(DISCORD_USER_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
    cache: "no-store",
  });
  return response.ok ? parseDiscordUser(await response.json()) : null;
}

/**
 * Échange le code contre un jeton Discord, lit le profil, puis oublie le jeton : il n'est
 * jamais stocké. null si Discord refuse ou si le profil est invalide.
 */
export async function exchangeCodeForDiscordProfile(
  code: string,
  codeVerifier: string,
): Promise<DiscordProfile | null> {
  try {
    const tokens = await discordClient().validateAuthorizationCode(code, codeVerifier);
    return await fetchDiscordUser(tokens.accessToken());
  } catch {
    return null;
  }
}
