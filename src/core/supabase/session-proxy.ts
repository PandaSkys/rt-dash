import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readSupabaseConfig } from "@/core/supabase/supabase-config";

interface RefreshedSession {
  response: NextResponse;
  isSignedIn: boolean;
}

/**
 * Rafraîchit la session Supabase (modèle @supabase/ssr) : les cookies renouvelés partent
 * à la fois vers la suite de la requête et vers le navigateur.
 */
export async function refreshSession(
  request: NextRequest,
  requestHeaders: Headers,
): Promise<RefreshedSession> {
  const { url, anonKey } = readSupabaseConfig();
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        requestHeaders.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers ?? {})) {
          response.headers.set(name, value);
        }
      },
    },
  });

  // getClaims vérifie la signature du jeton (et le renouvelle s'il a expiré).
  const { data } = await supabase.auth.getClaims();
  return { response, isSignedIn: Boolean(data?.claims) };
}
