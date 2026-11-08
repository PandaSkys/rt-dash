export interface DiscordIdentity {
  discordId: string;
  /** Pseudo Discord (nom d'utilisateur). */
  username: string;
  /** Nom affiché Discord, ou le pseudo s'il n'y en a pas. */
  displayName: string;
}

/** Forme minimale d'un utilisateur Supabase Auth, sans dépendre du client Supabase. */
interface UserWithIdentities {
  identities?: { provider: string; identity_data?: Record<string, unknown> }[];
}

const DISCORD_ID_PATTERN = /^[0-9]{17,20}$/;

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Identité Discord de l'utilisateur, lue dans `identities` (remplie par Supabase à partir
 * de Discord). Jamais dans `user_metadata`, que l'utilisateur peut modifier lui-même (L-01).
 */
export function discordIdentityOf(user: UserWithIdentities): DiscordIdentity | null {
  const data =
    user.identities?.find((identity) => identity.provider === "discord")?.identity_data ?? {};
  const discordId = discordIdOf(data);
  const username = textOf(data.full_name);
  if (!discordId || !username) return null;

  const customClaims = (data.custom_claims ?? {}) as Record<string, unknown>;
  return { discordId, username, displayName: textOf(customClaims.global_name) ?? username };
}

function discordIdOf(data: Record<string, unknown>): string | null {
  const discordId = textOf(data.provider_id);
  return discordId && DISCORD_ID_PATTERN.test(discordId) ? discordId : null;
}
