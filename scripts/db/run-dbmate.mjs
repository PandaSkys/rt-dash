// Lance dbmate avec la connexion du propriétaire de la base (rtdash_owner), jamais avec
// celle de l'application. Usage : node scripts/db/run-dbmate.mjs <commande dbmate>
import { spawnSync } from "node:child_process";

const ownerUrl = process.env.DATABASE_OWNER_URL;
if (!ownerUrl) {
  console.error("Variable d'environnement manquante : DATABASE_OWNER_URL (voir .env.example).");
  process.exit(1);
}

const options = [
  "--migrations-dir",
  "db/migrations",
  // Table de suivi dans le schéma interne : public ne contient que des tables sous RLS.
  "--migrations-table",
  "rtdash.schema_migrations",
  "--no-dump-schema",
  "--wait",
];

const result = spawnSync("dbmate", [...options, ...process.argv.slice(2)], {
  stdio: "inherit",
  // L'URL passe par l'environnement : elle n'apparaît pas dans la liste des processus.
  env: { ...process.env, DATABASE_URL: ownerUrl },
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
