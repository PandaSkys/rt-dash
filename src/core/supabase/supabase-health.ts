import { readSupabaseConfig } from "@/core/supabase/supabase-config";

const HEALTH_TIMEOUT_MS = 3_000;

export async function isSupabaseReachable(): Promise<boolean> {
  const { url, anonKey } = readSupabaseConfig();
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
