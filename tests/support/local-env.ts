import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const LOCAL_ENV_FILE = ".env.development.local";

/** Variables de .env.development.local (poste de développement) ; vide en CI. */
export function readLocalEnvFile(): Record<string, string> {
  const fileEnv = existsSync(LOCAL_ENV_FILE) ? parseEnv(readFileSync(LOCAL_ENV_FILE, "utf8")) : {};
  return Object.fromEntries(
    Object.entries(fileEnv).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

/** Variables des tests : fichier local, complété par celles du processus (CI). */
export function readTestEnv(): Record<string, string | undefined> {
  return { ...readLocalEnvFile(), ...process.env };
}
