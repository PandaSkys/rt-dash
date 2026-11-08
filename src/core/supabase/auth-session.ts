import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/core/supabase/server-client";

/** Adresse Discord où envoyer l'utilisateur, ou null si Supabase refuse. */
export async function startDiscordSignIn(callbackUrl: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    // Supabase ajoute toujours « email » (L-03) ; RT-Dash ne le lit jamais.
    options: { redirectTo: callbackUrl, scopes: "identify" },
  });
  return error ? null : data.url;
}

export async function exchangeAuthCode(code: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}

export async function signOutCurrentUser(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/** Utilisateur de la session, jeton validé auprès de Supabase Auth ; null sans session. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
