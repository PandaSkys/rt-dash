import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/core/supabase/database.types";
import { readSupabaseConfig } from "@/core/supabase/supabase-config";

/**
 * Client Supabase de la requête en cours, porteur de la session de l'utilisateur :
 * chaque requête part avec son jeton et Postgres applique la RLS en son nom.
 * À créer à chaque requête, jamais partagé.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = readSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component ne peut pas écrire de cookies : le proxy rafraîchit la session.
        }
      },
    },
  });
}
