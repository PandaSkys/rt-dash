import "server-only";
import { sql, type Transaction } from "kysely";
import { getDatabase } from "@/core/db/client";
import type { DB } from "@/core/db/database.types";

export type SessionTransaction = Transaction<DB>;

/**
 * Exécute des requêtes pour l'utilisateur qui porte ce jeton de session, dans une transaction.
 * La base vérifie elle-même le jeton (rtdash.use_session) et en déduit l'utilisateur : la RLS
 * et l'historique s'appliquent en son nom (design § 6.1). Sans jeton valide, la base ne voit
 * personne et la RLS ne laisse rien passer.
 */
export function withSession<Result>(
  token: string | null,
  work: (transaction: SessionTransaction) => Promise<Result>,
): Promise<Result> {
  return getDatabase()
    .transaction()
    .execute(async (transaction) => {
      await sql`select rtdash.use_session(${token})`.execute(transaction);
      return work(transaction);
    });
}
