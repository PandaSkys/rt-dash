import { type NextRequest, NextResponse } from "next/server";
import { loginFailedUrl } from "@/core/auth/auth-urls";
import { readAppUrl } from "@/core/config/app-url";
import { exchangeAuthCode } from "@/core/supabase/auth-session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const isSignedIn = code !== null && (await exchangeAuthCode(code));
  return NextResponse.redirect(isSignedIn ? `${readAppUrl()}/` : loginFailedUrl());
}
