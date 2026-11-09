// Régénère les types TypeScript de la base (kysely-codegen) depuis le schéma public.
// Connexion du propriétaire : il voit toutes les tables, même celles fermées à l'application.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

if (!process.env.DATABASE_OWNER_URL) {
  console.error("Variable d'environnement manquante : DATABASE_OWNER_URL (voir .env.example).");
  process.exit(1);
}

// Lancé avec Node directement, sans shell : sous Windows, cmd interpréterait « env(…) ».
const packageJson = createRequire(import.meta.url).resolve("kysely-codegen/package.json");
const codegenBin = path.join(path.dirname(packageJson), "dist/cli/bin.js");

const result = spawnSync(
  process.execPath,
  [
    codegenBin,
    "--dialect",
    "postgres",
    "--url",
    "env(DATABASE_OWNER_URL)",
    "--default-schema",
    "public",
    "--include-pattern",
    "public.*",
    "--out-file",
    "src/core/db/database.types.ts",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
