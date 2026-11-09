import "server-only";
import { sql } from "kysely";
import { getDatabase } from "@/core/db/client";

const HEALTH_TIMEOUT_MS = 3_000;

function timeout(): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Délai dépassé")), HEALTH_TIMEOUT_MS).unref();
  });
}

export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await Promise.race([sql`select 1`.execute(getDatabase()), timeout()]);
    return true;
  } catch {
    return false;
  }
}
