import type { DiscordProfile } from "@/core/auth/discord-profile";

const DISCORD_ID_PATTERN = /^[0-9]{17,20}$/;

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Lit la réponse de GET /users/@me ; null si elle n'a pas la forme attendue. */
export function parseDiscordUser(body: unknown): DiscordProfile | null {
  if (typeof body !== "object" || body === null) return null;
  const user = body as Record<string, unknown>;
  const discordId = textOf(user.id);
  const discordUsername = textOf(user.username);
  if (!discordId || !DISCORD_ID_PATTERN.test(discordId) || !discordUsername) return null;

  return {
    discordId,
    discordUsername,
    discordDisplayName: textOf(user.global_name) ?? discordUsername,
  };
}
