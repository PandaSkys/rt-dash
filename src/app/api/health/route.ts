import { isSupabaseReachable } from "@/core/supabase/supabase-health";

export async function GET() {
  if (await isSupabaseReachable()) {
    return Response.json({ status: "ok", supabase: "ok" });
  }
  return Response.json({ status: "error", supabase: "unreachable" }, { status: 503 });
}
