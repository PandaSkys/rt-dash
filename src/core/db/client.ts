import "server-only";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "@/core/db/database.types";
import { readDatabaseUrl } from "@/core/db/database-url";

export type Database = Kysely<DB>;

export function createDatabase(connectionString: string): Database {
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }) });
}

let sharedDatabase: Database | undefined;

/**
 * Pool de connexions de l'application (rôle rtdash_app), partagé par tout le serveur.
 * Toute requête faite pour un utilisateur passera par withSession (T-2.3).
 */
export function getDatabase(): Database {
  sharedDatabase ??= createDatabase(readDatabaseUrl());
  return sharedDatabase;
}
