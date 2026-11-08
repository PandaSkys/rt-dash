import { NextResponse } from "next/server";
import { loginUrl } from "@/core/auth/auth-urls";
import { signOutCurrentUser } from "@/core/supabase/auth-session";

// POST uniquement : un lien ou une image ne peut pas déconnecter l'utilisateur.
export async function POST() {
  await signOutCurrentUser();
  return NextResponse.redirect(loginUrl(), 303);
}
