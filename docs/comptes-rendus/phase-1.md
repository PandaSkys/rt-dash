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
- Premier commit signé (signature SSH, 1Password) `d93a132` et push sur `main`. Une 1re tentative avait échoué car 1Password était verrouillé ; signature jamais contournée.

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

---

## T-1.3 — Vitest et Testing Library · 2026-11-08

**Ce qui a été fait**
- Vitest 5 avec deux projets : `unit` (jsdom, `tests/unit/`) et `integration` (node, `tests/integration/`, vide pour l'instant).
- Scripts `test`, `test:unit`, `test:integration`. Alias `@/` reconnu dans les tests.
- Un test d'exemple : la page d'accueil affiche le titre « RT-Dash ».

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `vitest.config.mts` | créé | deux projets, alias `@/` (`.mts` pour éviter l'avertissement de chargement ESM) |
| `vitest.setup.ts` | créé | matchers `jest-dom` pour Testing Library |
| `tests/unit/app/page.test.tsx` | créé | test d'exemple (miroir de `src/`) |
| `tests/integration/` | créé (vide) | emplacement des tests d'intégration (phase 2) |
| `package.json`, `pnpm-lock.yaml` | modifiés | dépendances et scripts de test |
| `docs/tasks.md` | modifié | T-1.3 cochée |

**Comment vérifier** : `pnpm test` (1 test passe) ; `pnpm test:integration` ne signale rien à exécuter et réussit.

**Tests** : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅

**Écarts avec les documents**
- Le test d'exemple a été écrit après la page (elle existait déjà depuis T-1.1) : pas de cycle « échec puis succès » ici, la logique n'est pas métier.

**Hors périmètre, non fait** : aucun. **Points ouverts** : aucun.

**Relecture**
- [x] Code relu comme un nouveau venu le lirait (design § 3.2).

---

## T-1.4 et T-1.5 — Playwright et `/api/health` · 2026-11-08

Les deux tâches sont liées (le test de fumée de T-1.4 vise la route de T-1.5) ; menées ensemble, test d'abord.

**Ce qui a été fait**
- Test e2e écrit d'abord : il échoue tant que la route n'existe pas (le serveur de test n'est jamais « prêt »).
- Route `GET /api/health` : 200 + `{"status":"ok"}`, avec un test unitaire (écrit avant, échec constaté).
- Playwright : l'e2e construit puis lance le **build de production** sur le port 3100, comme en CI et sur le VPS ; script `test:e2e`. Le navigateur Chromium a été téléchargé par `playwright install` (outil de test, hors dépôt).

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `playwright.config.ts` | créé | config e2e (build de production, port 3100) |
| `tests/e2e/health.spec.ts` | créé | test de fumée (T-1.4) |
| `src/app/api/health/route.ts` | créé | endpoint de santé (T-1.5) |
| `tests/unit/app/api/health/route.test.ts` | créé | test unitaire de la route |
| `package.json`, `pnpm-lock.yaml` | modifiés | Playwright et script `test:e2e` |
| `docs/tasks.md` | modifié | T-1.4 et T-1.5 cochées |

**Comment vérifier** : `pnpm test:e2e` (1 test passe) ; `pnpm test` (2 tests passent).

**Tests** : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ · `pnpm test:e2e` ✅

**Écarts avec les documents** : aucun. **Hors périmètre, non fait** : aucun.
**Points ouverts** : `pnpm test` ne lance pas l'e2e (il est plus lent) ; la CI les enchaînera en T-1.9.

**Relecture**
- [x] Code relu comme un nouveau venu le lirait (design § 3.2).

---

## T-1.6 — `next.config`, en-têtes de sécurité, CSP avec nonce · 2026-11-08

**Ce qui a été fait**
- `output: "standalone"` ; pas de `serverActions.allowedOrigins` (L-04, commenté dans le fichier).
- En-têtes fixes (`next.config.ts`) : `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (caméra, micro, géolocalisation, paiement, USB fermés).
- CSP avec **nonce** différent à chaque requête, posée par `src/proxy.ts` (`frame-ancestors 'none'`, `object-src 'none'`, scripts uniquement avec nonce + `strict-dynamic`, `unsafe-eval` seulement en développement). Le constructeur de la CSP est une fonction pure testée.
- Le layout racine est forcé en rendu dynamique, sinon la page serait figée au build, sans nonce.
- Tests d'abord : unitaires (CSP, nonce) en échec puis au vert ; e2e sur le build de production : chaque en-tête, nonce différent par requête, nonce présent sur les scripts de la page, aucune violation de CSP dans le navigateur.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `next.config.ts` | modifié | standalone + en-têtes fixes |
| `src/core/security/content-security-policy.ts` | créé | génération du nonce et de la CSP (logique pure) |
| `src/proxy.ts` | créé | pose la CSP à chaque requête (sera complété en T-2.4 pour la session) |
| `src/app/layout.tsx` | modifié | rendu dynamique pour le nonce |
| `tests/unit/core/security/content-security-policy.test.ts` | créé | tests de la CSP |
| `tests/e2e/security-headers.spec.ts` | créé | tests e2e des en-têtes |
| `docs/tasks.md` | modifié | T-1.6 cochée |

**Comment vérifier** : `pnpm test` (8 tests) puis `pnpm test:e2e` (6 tests).

**Tests** : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ · `pnpm test:e2e` ✅

**Écarts avec les documents**
- `upgrade-insecure-requests` (présent dans l'exemple de la doc Next) n'est pas ajouté : le HTTPS est imposé par Caddy et HSTS (T-1.8).

**Hors périmètre, non fait** : aucun.

**Points ouverts / questions**
- Next affiche l'avertissement « `next start` ne fonctionne pas avec `output: standalone` » pendant l'e2e. Les tests passent ; l'image Docker (T-1.7) lancera `node server.js`. À toi de dire si tu veux que l'e2e lance aussi le serveur standalone.
- Rappel : la CSP est stricte (`style-src` avec nonce) ; il faudra la revérifier avec Tailwind et les composants shadcn (phase 4).

**Relecture**
- [x] Code relu comme un nouveau venu le lirait (design § 3.2).

**Complément du 2026-11-08 (validé par l'utilisateur)** : l'e2e lance désormais le **serveur standalone** (`node .next/standalone/server.js`), le même que l'image Docker ; l'avertissement de `next start` a disparu. Fichiers : `playwright.config.ts` (modifié), `scripts/prepare-standalone.mjs` (créé : copie `.next/static` et `public/` à côté de `server.js`, comme le Dockerfile). E2E : 6 tests ✅.

---

## T-1.7 — Dockerfile · 2026-11-08

**Ce qui a été fait** — l'image est construite en trois étapes :
1. `deps` : installe pnpm 11.20.0 puis les dépendances avec le fichier de verrouillage figé ;
2. `build` : `next build` en standalone, **sans aucune variable d'application** (la même image sert partout) ;
3. `runner` : uniquement le serveur standalone, les fichiers statiques et `public/`, avec l'utilisateur non root `node`, un `HEALTHCHECK` sur `/api/health`, et **npm, npx, corepack et yarn supprimés** (L-06).
- Image de base `node:24-alpine` **épinglée par empreinte** (L-05).
- `.dockerignore` : aucun `.env*`, ni `.git`, ni tests ou docs dans le contexte de build.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `Dockerfile` | créé | image de production |
| `.dockerignore` | créé | contexte de build minimal, sans secret |
| `public/.gitkeep` | créé | le dossier `public/` doit exister pour le Dockerfile ; les logos y arriveront en T-4.3 |
| `docs/tasks.md` | modifié | T-1.7 cochée |

**Comment vérifier**
1. `docker build -t rt-dash:local .`
2. `docker run -d --name rt-dash-test -p 3200:3000 rt-dash:local`, puis `curl -i localhost:3200/api/health` → 200, `{"status":"ok"}` et les en-têtes de sécurité.
3. `docker inspect rt-dash-test --format '{{.State.Health.Status}}'` → `healthy`. `docker exec rt-dash-test which npm` → rien.

**Tests** : vérifications ci-dessus faites à la main (✅). Le scan Trivy de l'image et le test de configuration du conteneur arrivent en T-1.8 et T-1.9. `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm test` ✅

**Écarts avec les documents** : aucun.

**Points ouverts**
- L'image fait 298 Mo. Ce n'est pas un problème pour l'instant ; on pourra l'alléger plus tard si besoin (non fait, hors périmètre).
- Vérifié au passage : l'ICU française est présente dans l'image de base (`Intl` en `fr-FR` donne « dimanche »), utile pour T-4.10.

**Relecture**
- [x] Fichiers relus ; commentaires limités au « pourquoi ».

---

## T-1.8 — docker-compose, Caddy, `.env.example` · 2026-11-08

**Ce qui a été fait**
- `docker-compose.yml` (production) : service `app` (image GHCR, lecture seule, tmpfs pour `/tmp` et le cache Next, `cap_drop: [ALL]`, `no-new-privileges`, contrôle de santé, **aucun port publié**) et service `caddy` (seul à publier 80/443, image épinglée par empreinte, démarre quand l'app est en bonne santé).
- `Caddyfile` : HTTPS automatique pour `{$DOMAIN}`, **HSTS** (1 an, sous-domaines), en-tête `Server` retiré, redirection HTTP → HTTPS (308) faite par Caddy.
- `.env.example` : uniquement les variables du VPS (design § 13.3), commentées, sans aucune vraie valeur.
- Test d'abord : `tests/unit/infra/docker-compose.test.ts` lit la configuration et vérifie chaque mesure de durcissement et HSTS (en échec avant d'écrire les fichiers).

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `docker-compose.yml` | créé | déploiement app + Caddy |
| `Caddyfile` | créé | HTTPS, HSTS, proxy vers l'app |
| `.env.example` | créé | modèle commenté des variables du VPS |
| `tests/unit/infra/docker-compose.test.ts` | créé | test de la configuration du conteneur |
| `package.json`, `pnpm-lock.yaml` | modifiés | `yaml` (lecture du fichier compose dans le test) |
| `docs/tasks.md` | modifié | T-1.8 cochée |

**Comment vérifier** (en local, `DOMAIN=localhost`)
1. `docker build -t ghcr.io/pandaskys/rt-dash:local .`
2. Créer un `.env` à partir de `.env.example` avec `DOMAIN=localhost`, `TAG=local`.
3. `docker compose up -d`, puis `curl -k https://localhost/api/health` → 200, `{"status":"ok"}`, HSTS, CSP. `http://localhost` redirige en 308 vers HTTPS.
4. `docker compose down -v` et supprimer le `.env` de test.

Fait le 2026-11-08 : tout est conforme ; la page `/` s'affiche malgré le système de fichiers en lecture seule. Le `.env` de test a été supprimé ensuite.

**Tests** : `pnpm test` (16 tests) ✅ · `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅

**Écarts avec les documents**
- Image `caddy:2-alpine` épinglée par empreinte, au lieu de `caddy:2` (L-05 ; plus légère).
- `depends_on` attend que l'app soit en bonne santé (`service_healthy`).
- `GITHUB_OWNER` vaut `pandaskys` en minuscules : GHCR n'accepte que des minuscules dans le nom de l'image.

**Hors périmètre, non fait** : durcir aussi le conteneur Caddy (non demandé).
**Points ouverts** : aucun.

**Relecture**
- [x] Fichiers relus ; commentaires limités au « pourquoi ».

---

## T-1.9 — CI GitHub Actions (`ci.yml`) · 2026-11-08

**En clair, pour débuter** : à chaque `git push`, GitHub loue trois machines Linux et y lance nos vérifications, en parallèle. Si l'une échoue, une croix rouge apparaît à côté du commit (onglet *Actions* du dépôt) ; plus tard, la protection de `main` empêchera de fusionner tant que les trois ne sont pas vertes.

| Vérification (job) | Ce qu'elle fait |
|---|---|
| **Qualité, sécurité et tests unitaires** | installe les dépendances (avec cache) → lint → types → formatage → **gitleaks** (cherche un secret dans tout l'historique git) → **`pnpm audit`** (bloque si une dépendance a une faille élevée) → refuse `NEXT_PUBLIC_` et `SERVICE_ROLE` dans `src/` → tests unitaires |
| **Build et tests de bout en bout** | build de production + serveur standalone + tests Playwright (santé, en-têtes, CSP) ; en cas d'échec, le rapport Playwright est téléchargeable 7 jours |
| **Image Docker et scan Trivy** | construit l'image et la fait analyser par **Trivy**, qui bloque sur toute faille élevée ou critique corrigeable |

**Sécurité de la CI elle-même**
- Chaque action GitHub est épinglée par l'**empreinte de son commit** (SHA), et les scanners par l'**empreinte de leur image** (L-05) : une étiquette (`v7`) peut être déplacée par un attaquant, une empreinte non.
- gitleaks et Trivy tournent depuis leurs **images Docker officielles** épinglées, plutôt que par des actions tierces.
- Le workflow n'a que le droit de **lire** le dépôt (`permissions: contents: read`).
- Un nouveau push sur la même branche annule l'exécution précédente (`concurrency`).

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `.github/workflows/ci.yml` | créé | la CI |
| `package.json` | modifié | champ `packageManager: pnpm@11.20.0`, lu par l'action pnpm (une seule version, partout) |
| `docs/tasks.md` | modifié | T-1.9 cochée une fois la CI vérifiée sur GitHub |

**Vérifié en local (2026-11-08)**
- Trivy sur l'image : aucune faille élevée ou critique (code de sortie 0).
- gitleaks sur le dépôt : aucun secret. Sur un dépôt jetable contenant un faux jeton GitHub : `leaks found: 1`, code de sortie 1 (échec attendu).
- `pnpm audit --audit-level=high` : 1 faille modérée seulement, donc pas bloquante ; aucune exception n'est nécessaire aujourd'hui. Le jour où il en faudra une, elle sera nominative, justifiée et datée dans `pnpm-workspace.yaml` (L-06).

**Écarts avec les documents**
- Le Dockerfile fixe aussi `pnpm@11.20.0` : la version figure donc à deux endroits (`package.json` et `Dockerfile`). Dependabot devra mettre à jour les deux.

**Vérifié sur GitHub (2026-11-08)**
- Commit `3c2b0c0` sur `main` : les trois jobs sont **verts** (exécution 42501750607).
- Branche jetable `test/gitleaks` avec un faux jeton GitHub : le job « Qualité » **échoue à l'étape gitleaks**, les deux autres restent verts (exécution 42501805078). Branche supprimée ensuite, en local et sur GitHub, avec l'accord de l'utilisateur. Le faux jeton est inventé : il ne donne accès à rien.
- `actionlint` (vérificateur de workflows) : aucune erreur.

**Tests** : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ · `pnpm test:e2e` ✅ · CI GitHub ✅

**Hors périmètre, non fait** : aucun.

**Points ouverts**
- La protection de `main` (CI obligatoire, commits signés, T-1.2) peut maintenant être posée : les trois vérifications existent. À faire avec l'utilisateur.

**Relecture**
- [x] Workflow relu ; commentaires limités au « pourquoi ».

---

## T-1.10 — `deploy.yml` (image GHCR) · 2026-11-08

**En clair** : quand la CI est verte sur `main`, ce second robot fabrique l'image Docker et la range dans le registre de GitHub (GHCR) sous deux noms : l'empreinte du commit (`:3c2b0c0…`, pour revenir à une version précise) et `:latest`. La suite (migrations de la base, premier superadmin, mise à jour du VPS par SSH, contrôle de `/api/health`) est **déjà écrite mais désactivée** : elle ne tourne que si la variable du dépôt `DEPLOY_ENABLED` vaut `true` (phase 11).

**Ce qui a été fait**
- Déclenché par la fin de la CI sur `main` (seulement si elle est verte), ou à la main avec une empreinte pour **redéployer une image existante** sans la reconstruire.
- Droits minimaux : écriture des paquets (GHCR) uniquement pour le job de l'image ; secrets dans l'environnement GitHub `production` ; empreinte SSH du VPS vérifiée (`StrictHostKeyChecking=yes`).
- Deux déploiements ne se chevauchent jamais (`concurrency`).
- Actions épinglées par empreinte (L-05). `actionlint` : aucune erreur.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `.github/workflows/deploy.yml` | créé | publication de l'image, déploiement préparé |
| `docs/tasks.md` | modifié | T-1.10 cochée une fois l'image visible dans GHCR |

**Écarts avec les documents**
- Le nom de l'image est passé en minuscules automatiquement (GHCR l'exige ; le propriétaire est `PandaSkys`).
- La version de la CLI Supabase du déploiement (3.0.0) est provisoire : à aligner en T-2.1 sur celle utilisée en local.
- L'étape « premier superadmin » appelle `rtdash.bootstrap_superadmin`, qui n'existera qu'en phase 3 ; sans effet tant que `DEPLOY_ENABLED` n'est pas activé.

**Premier essai sur GitHub (commit `26aff14`, 2026-11-08)** : CI verte ; `deploy.yml` échoue au push de l'image : `denied: permission_denied: read_package`. Cause probable : un paquet GHCR `rt-dash` existe encore depuis la première tentative, rattaché à l'ancien dépôt supprimé ; le nouveau dépôt n'a donc pas le droit d'y écrire. Confirmé : supprimer l'ancien dépôt ne suffisait pas, le paquet survivait. L'utilisateur a **supprimé l'ancien paquet** ; workflow relancé sans nouveau commit : **image publiée** `ghcr.io/pandaskys/rt-dash:26aff14a8f4c8dffc08e3b219e0d877664b5fb88` et `:latest` (même empreinte `sha256:b9a3d567…`). Le job « Migrations et mise à jour du VPS » est bien ignoré (`DEPLOY_ENABLED` non défini).

---

## T-1.11 — `README.md` · 2026-11-08

**Ce qui a été fait** : lancer en local, vérifications (mêmes commandes qu'en CI), Docker, variables (renvoi vers `.env.example`), CI/CD, liens vers `docs/` et `CLAUDE.md`.

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `README.md` | créé | point d'entrée du dépôt |
| `docs/tasks.md` | modifié | T-1.11 cochée |

---

## T-1.12 — Dependabot · 2026-11-08

**En clair** : Dependabot surveille chaque semaine nos dépendances (npm/pnpm), l'image Docker de base, l'image Caddy et les actions GitHub, et ouvre une pull request quand une mise à jour existe. La CI la vérifie ; on fusionne si elle est verte. Il attend **3 jours** après la sortie d'une version avant de la proposer (L-05). Les petites mises à jour des outils de développement sont regroupées en une seule pull request.

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `.github/dependabot.yml` | créé | configuration des mises à jour |
| `docs/tasks.md` | modifié | T-1.12 cochée une fois les alertes activées |

**Fait avec l'accord de l'utilisateur** : alertes de vulnérabilité Dependabot et mises à jour de sécurité **activées** sur le dépôt (vérifié par l'API GitHub). Le scan des secrets et la protection au push étaient déjà actifs.

**Relecture**
- [x] Fichiers relus.

---

## Bilan de la phase 1 · 2026-11-08

**Résumé** : le socle est en place. Next.js 16 en TypeScript strict, avec des garde-fous de lisibilité et de sécurité appliqués par ESLint (zéro avertissement). Tests unitaires (Vitest) et de bout en bout (Playwright, sur le serveur de production). En-têtes de sécurité et CSP avec nonce. Image Docker durcie, servie derrière Caddy en HTTPS. CI à trois vérifications sur chaque push, publication automatique de l'image sur GHCR, Dependabot.

**Tâches** : T-1.1 ✅ · T-1.2 ⚠️ (tout sauf la protection de `main`) · T-1.3 ✅ · T-1.4 ✅ · T-1.5 ✅ · T-1.6 ✅ · T-1.7 ✅ · T-1.8 ✅ · T-1.9 ✅ · T-1.10 ✅ · T-1.11 ✅ · T-1.12 ✅

**Leçons appliquées** : L-04 (pas de `serverActions.allowedOrigins`) · L-05 (actions et images épinglées par empreinte, Dependabot avec 3 jours de délai) · L-06 (npm, corepack et yarn retirés de l'image ; Trivy vert ; mécanisme d'exceptions de `pnpm audit` prêt, aucune nécessaire) · L-08 (CI sur chaque push, toutes branches).

**Démonstration**
- `pnpm dev` → http://localhost:3000 ; `pnpm lint`, `pnpm typecheck`, `pnpm test` (16 tests), `pnpm test:e2e` (6 tests).
- Onglet *Actions* du dépôt : CI verte sur `3c2b0c0` et `26aff14` ; échec voulu de gitleaks sur la branche de test (supprimée).
- Image : `ghcr.io/pandaskys/rt-dash:latest`.

**Captures** : aucun écran dans cette phase.

**Commits** : `d93a132` (socle), `3c2b0c0` (T-1.3 à T-1.9), `26aff14` (T-1.10 à T-1.12), tous signés. Les mises à jour de ce compte rendu et de `tasks.md` faites après `26aff14` ne sont pas encore commitées.

**Reste à faire / risques**
- **Protection de `main`** (T-1.2) : non posée, au choix de l'utilisateur. Sans elle, un push direct sur `main` reste possible même si la CI échoue.
- Le paquet GHCR est **privé** par défaut : le VPS devra s'y authentifier (`docker login ghcr.io`) en phase 11, ou le paquet devra être rendu public.
- La version de la CLI Supabase dans `deploy.yml` (3.0.0) est à aligner en T-2.1.
- La CSP stricte (`style-src` avec nonce) est à revérifier avec Tailwind et shadcn (phase 4).
- 1Password s'est verrouillé deux fois pendant les commits : la signature a échoué puis réussi après déverrouillage, sans jamais être contournée.

**Validation de l'utilisateur** : ☑ validée le 2026-11-08
