import "server-only";
import { sql } from "kysely";
import type { DiscordProfile } from "@/core/auth/discord-profile";
import { getDatabase } from "@/core/db/client";
import { withSession } from "@/core/db/with-session";

/** Ouvre une session après la vérification auprès de Discord (seul point de confiance, § 6.1). */
export async function openSession(token: string, profile: DiscordProfile): Promise<void> {
  await sql`select open_session(
    ${token}, ${profile.discordId}, ${profile.discordUsername}, ${profile.discordDisplayName}
  )`.execute(getDatabase());
}

export async function closeSession(token: string): Promise<void> {
  await sql`select close_session(${token})`.execute(getDatabase());
}

interface SessionProfileRow {
  discord_id: string;
  discord_username: string;
  discord_display_name: string;
}

/** Profil Discord de la session, ou null si le jeton est absent, inventé, expiré ou fermé. */
export function readSessionProfile(token: string | null): Promise<DiscordProfile | null> {
  return withSession(token, async (transaction) => {
    const { rows } = await sql<SessionProfileRow>`
      select discord_id, discord_username, discord_display_name from current_discord_profile()
    `.execute(transaction);
    const row = rows[0];
    return row
      ? {
          discordId: row.discord_id,
          discordUsername: row.discord_username,
          discordDisplayName: row.discord_display_name,
        }
      : null;
  });
}
