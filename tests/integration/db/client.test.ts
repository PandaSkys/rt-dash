import { sql } from "kysely";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createDatabase } = await import("@/core/db/client");
const { readDatabaseUrl } = await import("@/core/db/database-url");

// Base locale (pnpm db:up) ou base de la CI : DATABASE_URL = rôle de l'application.
const db = createDatabase(readDatabaseUrl());
afterAll(() => db.destroy());

describe("client de la base", () => {
  it("se connecte avec le rôle restreint de l'application", async () => {
    const { rows } = await sql<{ role: string }>`select current_user as role`.execute(db);

    expect(rows[0]?.role).toBe("rtdash_app");
  });

  it("ne peut pas modifier le schéma", async () => {
    await expect(sql`create table public.essai (id int)`.execute(db)).rejects.toThrow(
      /permission denied/,
    );
  });
});
