import { type Environment, readRequiredEnv } from "@/core/config/read-required-env";

const APPLICATION_ROLE = "rtdash_app";

/**
 * Connexion de l'application à la base. Refuse tout autre rôle que rtdash_app :
 * l'application ne doit jamais tourner avec les droits du propriétaire (design § 6.1).
 */
export function readDatabaseUrl(env: Environment = process.env): string {
  const url = readRequiredEnv(env, "DATABASE_URL");
  if (decodeURIComponent(new URL(url).username) !== APPLICATION_ROLE) {
    throw new Error(`DATABASE_URL doit utiliser le rôle ${APPLICATION_ROLE} (design § 6.1).`);
  }
  return url;
}
