import { isDatabaseReachable } from "@/core/db/database-health";

export async function GET() {
  if (await isDatabaseReachable()) {
    return Response.json({ status: "ok", database: "ok" });
  }
  return Response.json({ status: "error", database: "unreachable" }, { status: 503 });
}
