import { type Environment, readRequiredEnv } from "@/core/config/read-required-env";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function readSupabaseConfig(env: Environment = process.env): SupabaseConfig {
  return {
    url: readRequiredEnv(env, "SUPABASE_URL"),
    anonKey: readRequiredEnv(env, "SUPABASE_ANON_KEY"),
  };
}
