import "server-only";
import { cookies } from "next/headers";
import type { DiscordProfile } from "@/core/auth/discord-profile";
import { SESSION_COOKIE } from "@/core/auth/session-cookie";
import { readSessionProfile } from "@/core/db/session-store";

/** Jeton de session de la requête en cours (cookie), ou null. */
export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Profil Discord de la session en cours, vérifiée par la base ; null sans session valide. */
export async function readCurrentSessionProfile(): Promise<DiscordProfile | null> {
  return readSessionProfile(await readSessionToken());
}
