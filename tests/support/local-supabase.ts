import { execSync } from "node:child_process";

export interface LocalSupabase {
  apiUrl: string;
  /** Ancienne clé publique (jeton `anon`). */
  anonKey: string;
  /** Nouvelle clé publique (`sb_publishable_…`). */
  publishableKey: string;
}

interface SupabaseStatus {
  API_URL: string;
  ANON_KEY: string;
  PUBLISHABLE_KEY: string;
}

/** Adresse et clés publiques du Supabase local lancé par `supabase start` (jamais le cloud). */
export function readLocalSupabase(): LocalSupabase {
  const output = execSync("pnpm exec supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const status = JSON.parse(output) as SupabaseStatus;
  return {
    apiUrl: status.API_URL,
    anonKey: status.ANON_KEY,
    publishableKey: status.PUBLISHABLE_KEY,
  };
}
