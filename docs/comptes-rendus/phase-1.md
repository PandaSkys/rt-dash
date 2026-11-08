# Compte rendu — Phase 1 : Socle, qualité, Docker et CI/CD

> Règles : [tasks.md, « Mode d'emploi »](../tasks.md).

---

## T-1.1 — Initialiser Next.js, Prettier, ESLint strict · 2026-11-08

**Ce qui a été fait**
- Projet Next.js 16.4.5 (App Router, `src/`, pnpm), TypeScript strict (+ `noUncheckedIndexedAccess`), alias `@/`, Prettier.
- ESLint avec toutes les règles du design § 3.2 (`max-lines` 300, `max-lines-per-function` 60, `complexity` 10, `max-depth` 3, `max-params` 3, `import/no-cycle`, `react/no-danger`, `no-explicit-any`, `no-restricted-imports` du client Supabase), `--max-warnings 0`. Les tests et `database.types.ts` sont exemptés des seules limites de taille.
- Page d'accueil provisoire (« RT-Dash »). Aucun Tailwind ni police : ils arrivent en T-4.1.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `package.json`, `pnpm-lock.yaml` | créés | dépendances et scripts `dev`, `build`, `lint`, `typecheck`, `format` |
| `tsconfig.json` | créé | TypeScript strict, alias `@/` |
| `next.config.ts` | créé | config minimale ; `agentRules: false` pour que Next ne régénère pas un `AGENTS.md` (CLAUDE.md fait foi) |
| `eslint.config.mjs` | créé | garde-fous § 3.2 |
| `.prettierrc.json`, `.prettierignore` | créés | formatage (docs et CLAUDE.md exclus pour ne pas les reformater) |
| `src/app/layout.tsx`, `src/app/page.tsx` | créés | page minimale en français |
| `docs/comptes-rendus/phase-1.md` | créé | ce compte rendu |
| `docs/tasks.md` | modifié | T-1.1 cochée |

**Comment vérifier**
1. `pnpm lint`, `pnpm typecheck`, `pnpm format:check` : aucun message.
2. `pnpm dev` puis http://localhost:3000 : page « RT-Dash ».

**Tests**
- Pas de logique pure. Vérifié à la main qu'un fichier volontairement fautif (any, 4 paramètres, `dangerouslySetInnerHTML`, import Supabase, cycle) fait échouer `pnpm lint` ; fichier supprimé ensuite.
- Résultats : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅

**Écarts avec les documents**
- ESLint 9 et TypeScript 5.9 (et non les dernières majeures ESLint 10 / TS 7) : compatibilité avec `eslint-config-next`. À réévaluer plus tard, pas maintenant.
- La règle `no-restricted-imports` (citée en T-2.1) est posée dès maintenant car T-1.1 demande « toutes les règles » du § 3.2.

**Hors périmètre, non fait**
- Aucun.

**Points ouverts / questions**
- Un `.env.local` datant de la 1re tentative est présent à la racine : je ne l'ai pas lu ; il sera ignoré par git (T-1.2).

**Relecture**
- [x] Code relu comme un nouveau venu le lirait (design § 3.2).

---

## T-1.2 — Dépôt, .gitignore, premier commit signé · 2026-11-08 (partielle)

**Ce qui a été fait**
- Dépôt neuf `PandaSkys/rt-dash` (créé par l'utilisateur) utilisé ; `git init -b main`, remote SSH.
- `.gitignore` (`.env*` sauf `.env.example`) et `.gitattributes` (fins de ligne LF, PNG binaires).
- Premier commit signé et push sur `main`.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `.gitignore` | créé | ne jamais commiter les secrets ni les artefacts de build |
| `.gitattributes` | créé | éviter la conversion CRLF sous Windows, qui casserait le test golden du message Discord (octet par octet) |
| `docs/comptes-rendus/phase-1.md` | modifié | cette section |

**Reste à faire (non cochée dans tasks.md)**
- Protection de `main` (CI obligatoire, commits signés) : la CI n'existe qu'à partir de T-1.9 ; à poser alors, avec l'utilisateur.

**Relecture**
- [x] Rien d'autre que la tâche n'a été modifié.
