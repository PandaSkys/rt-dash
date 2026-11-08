import { NextResponse } from "next/server";
import { loginFailedUrl } from "@/core/auth/auth-urls";
import { readAppUrl } from "@/core/config/app-url";
import { startDiscordSignIn } from "@/core/supabase/auth-session";

// Lien simple (GET) et non formulaire : la CSP « form-action 'self' » bloquerait la
// redirection vers Discord. Le code PKCE gardé en cookie empêche d'imposer une session.
export async function GET() {
  const discordUrl = await startDiscordSignIn(`${readAppUrl()}/auth/callback`);
  return NextResponse.redirect(discordUrl ?? loginFailedUrl());
}
