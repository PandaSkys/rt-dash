# Compte rendu — Phase 2 : Supabase (local et cloud), base et authentification Discord

> Règles : [tasks.md, « Mode d'emploi »](../tasks.md).

**Avant de commencer (2026-11-08)** : la phase 1 est validée, sauf la protection de `main` (T-1.2), toujours absente sur GitHub (vérifié par l'API). **Décision de l'utilisateur : reportée** (travail en solo, pas de passage par pull request). T-1.2 reste donc non cochée. À noter : le design § 14 indique cette règle « en place depuis le 2026-10-15 », ce qui n'est plus vrai sur le nouveau dépôt (document à corriger avec ton accord).

---

## T-2.1 — CLI Supabase, scripts `db:*`, client serveur · 2026-11-08

**Ce qui a été fait**
- CLI Supabase **3.0.0** installée comme dépendance de développement du projet (`pnpm exec supabase …`) : même version en local, en CI et dans `deploy.yml` (déjà en 3.0.0, rien à changer). Publiée le 2026-11-02, soit plus de 3 jours avant (L-05).
- `supabase init` → `supabase/config.toml` (Postgres 17, ports par défaut 54321 à 54324), `project_id = "rt-dash"`. Aucun autre réglage modifié : l'auth Discord arrive en T-2.3.
- `supabase start` fonctionne (Docker). **À savoir** : un volume Docker de la première tentative (2026-10-21) portait le même nom ; la base locale contenait encore les schémas `drizzle` et `rtdash` d'alors, sans aucun utilisateur. Je l'ai remise à zéro avec `supabase db reset` (base locale de développement uniquement, code abandonné selon D-01).
- Scripts : `pnpm db:reset`, `pnpm db:types` (→ `src/core/supabase/database.types.ts`, généré, exclu de Prettier depuis T-1.1), `pnpm db:test`.
- Client serveur `createSupabaseServerClient()` (`@supabase/ssr`) : créé à chaque requête avec les cookies de l'utilisateur ; `import "server-only"` empêche tout import côté navigateur. L'écriture des cookies est ignorée dans un Server Component (impossible là) : c'est le proxy qui rafraîchira la session (T-2.4).
- Lecture de la configuration (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) dans une petite fonction pure, avec un message d'erreur qui nomme la variable manquante sans jamais afficher de valeur.
- Règle ESLint `no-restricted-imports` : déjà posée en T-1.1 ; vérifiée de nouveau (un fichier jetable dans `src/app/` qui importe `@supabase/ssr` et `@/core/supabase/server-client` donne 2 erreurs). Les tests (`tests/**`) sont ajoutés aux dossiers autorisés, sinon ils ne pourraient pas tester ces modules.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `package.json`, `pnpm-lock.yaml` | modifiés | `supabase` (CLI), `@supabase/supabase-js`, `@supabase/ssr`, `server-only` ; scripts `db:reset`, `db:types`, `db:test` |
| `supabase/config.toml` | créé | configuration de Supabase local (`supabase init`) |
| `supabase/.gitignore` | créé | généré par `supabase init` (dossiers temporaires de la CLI) |
| `src/core/supabase/supabase-config.ts` | créé | lecture et contrôle des variables Supabase |
| `src/core/supabase/server-client.ts` | créé | client serveur avec la session de l'utilisateur |
| `src/core/supabase/database.types.ts` | créé (généré) | types de la base, par `pnpm db:types` |
| `eslint.config.mjs` | modifié | `tests/**` autorisé à importer `core/supabase` |
| `tests/unit/core/supabase/supabase-config.test.ts` | créé | variables présentes, absentes, vides ; valeur jamais dans l'erreur |
| `tests/unit/core/supabase/server-client.test.ts` | créé | URL et clé transmises, lecture et écriture des cookies, écriture refusée sans plantage |
| `docs/comptes-rendus/phase-2.md` | créé | ce compte rendu |
| `docs/tasks.md` | modifié | T-2.1 cochée |

**Comment vérifier**
1. Docker lancé, puis `pnpm exec supabase start` : la commande affiche les URL locales (API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`).
2. `pnpm db:types` régénère `src/core/supabase/database.types.ts` ; `git diff` ne montre aucun changement.
3. `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test`.

**Tests**
- Écrits d'abord (échec constaté : modules absents), puis le code.
- Résultats : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ (24 tests)

**Écarts avec les documents**
- La CLI est une dépendance du projet (paquet npm `supabase`) plutôt qu'une installation globale : une seule version, fixée dans le fichier de verrouillage.
- `pnpm db:types` produit un fichier non formaté (la CLI le signale). C'est voulu : le contrôle « types à jour » de T-2.5 compare la sortie brute.

**Hors périmètre, non fait** : aucun.

**Points ouverts / questions**
- `pnpm db:reset` signale « no files matched pattern: supabase/seed.sql » : normal, `seed.sql` arrive en T-3.6.
- La version majeure de Postgres en local (17) n'a pas été comparée au projet cloud ; je le vérifierai quand on se connectera au cloud (T-2.6).
- L'ancien `.env.local` de la première tentative n'a toujours pas été lu. En T-2.4, l'application aura besoin de `SUPABASE_URL` et `SUPABASE_ANON_KEY` du Supabase **local** dans ce fichier : je te dirai quoi y mettre.

**Relecture**
- [x] Code relu comme un nouveau venu le lirait (design § 3.2).

---

## T-2.2 — Première migration, droits par défaut fermés · 2026-11-08

**Ce qui a été fait**
- **Tests d'abord**
  - Test structurel pgTAP (20 vérifications), valable aussi pour les tables et fonctions des phases suivantes. Il échoue si : une table de `public` n'a pas la RLS ; `anon` a le moindre droit sur une table, une vue, une séquence ou une fonction ; `PUBLIC` peut exécuter une fonction ; `authenticated` a `DELETE` ou `TRUNCATE` ; une colonne protégée (design § 6.2) est modifiable par `authenticated` ; une fonction `security definer` n'a pas de `search_path` ; `anon` accède au schéma `rtdash`. Il crée aussi une table, une séquence et une fonction « sondes », comme le ferait une future migration, et vérifie qu'elles naissent **sans aucun droit**. Plus : extensions, types `enum`, `f_unaccent`, bucket privé.
  - Test REST (intégration) : avec l'ancienne clé `anon` **et** la nouvelle clé `publishable`, sans session, l'API REST ne décrit aucune table ni fonction, Storage ne montre aucun bucket, et les images de trajet ne se lisent ni ne se listent.
  - Échecs constatés avant la migration : le test pgTAP s'arrête (schéma `rtdash` absent). Le test REST, lui, passait déjà (base vide) : je l'ai vérifié en créant à la main une table avec les droits par défaut de Supabase, il échoue bien (table supprimée ensuite).
- **Migration** `20261108201318_foundation.sql` :
  1. droits par défaut fermés : Supabase accorde par défaut **tous** les droits à `anon` et `authenticated` sur chaque nouvel objet de `public` ; ils sont retirés (tables, séquences, fonctions), ainsi que le droit d'exécution implicite de `PUBLIC` sur toute nouvelle fonction ;
  2. extensions `pg_trgm`, `unaccent` (schéma `extensions`) et `pg_cron` ;
  3. schéma interne `rtdash`, fermé à `PUBLIC`, `anon` et `authenticated` ;
  4. types `app_role`, `ticket_status`, `data_source` ;
  5. `rtdash.f_unaccent(text)`, immuable donc indexable ;
  6. bucket privé `route-images`.
- Contre-épreuve : en retirant les lignes de droits par défaut, 5 vérifications pgTAP échouent (fonction exécutable par `anon` et `PUBLIC`, table, séquence et fonction sondes ouvertes). Migration remise à l'identique ensuite.
- Types régénérés (`pnpm db:types`) : les trois `enum` y apparaissent.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `supabase/migrations/20261108201318_foundation.sql` | créé | la migration |
| `supabase/tests/database/structure.test.sql` | créé | test structurel pgTAP (design § 6.6) |
| `tests/integration/supabase/public-key-reads-nothing.test.ts` | créé | test REST « la clé publique ne lit rien » |
| `tests/integration/support/local-supabase.ts` | créé | adresse et clés publiques du Supabase **local**, lues par `supabase status` (aucune clé écrite dans le dépôt) |
| `src/core/supabase/database.types.ts` | modifié (généré) | types `enum` |
| `docs/comptes-rendus/phase-2.md` | modifié | cette section |
| `docs/tasks.md` | modifié | T-2.2 cochée |

**Comment vérifier**
1. `pnpm db:reset` puis `pnpm db:test` : 20 tests, `Result: PASS`.
2. `pnpm test:integration` : 6 tests passent.

**Tests** : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ (30 tests, dont les 6 d'intégration) · `pnpm db:test` ✅ (20)

**Écarts avec les documents**
- `f_unaccent` est rangée dans le schéma interne **`rtdash`** (`rtdash.f_unaccent`) : ce n'est pas une fonction à appeler par l'API, et le design § 6.1 range les fonctions internes dans `rtdash`. L'index de recherche des tickets (T-5.1) l'appellera donc sous ce nom.
- `pg_cron` est créé dans `pg_catalog`, comme l'exige Supabase.
- Les droits par défaut ne sont fermés que pour les objets créés par le rôle `postgres`, celui des migrations (en local comme avec `supabase db push`). Les objets internes de Supabase (rôle `supabase_admin`) ne sont pas concernés ; le test structurel surveille de toute façon les schémas `public` et `rtdash`, quel que soit le créateur.

**Hors périmètre, non fait**
- Limites du bucket (8 Mo, PNG, JPEG ou WebP) et ses règles d'accès : prévues en phase 5 et T-6.4.

**Points ouverts / questions**
- `pnpm test` lance aussi les tests d'intégration, qui ont besoin de Supabase local. **Tant que T-2.5 n'est pas faite, la CI échouerait** sur ce point : il faudra commiter T-2.2 et T-2.5 ensemble (ou après T-2.5).

**Relecture**
- [x] Migration et tests relus ; commentaires limités au « pourquoi ».

---

## T-2.3 — Authentification Discord locale · 2026-11-08

**Ce qui a été fait**
- 🧑 L'utilisateur a ajouté la redirection `http://127.0.0.1:54321/auth/v1/callback` dans l'application Discord « RT-Dash » (celle du cloud est conservée) et rempli `supabase/.env` depuis 1Password. Aucun identifiant n'est passé par la discussion.
- `supabase/config.toml` : section `[auth.external.discord]`, identifiants lus dans les variables `SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID` et `SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET` ; `site_url = http://localhost:3000` et retour autorisé `http://localhost:3000/auth/callback` (design § 5.1, étape 3).
- `supabase/.env` créé avec les deux lignes vides à remplir ; il est ignoré par git (règle `.env*` du `.gitignore` racine, vérifiée avec `git check-ignore`).

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `supabase/config.toml` | modifié | fournisseur Discord, URL du site et URL de retour locales |
| `supabase/.env` | créé, **non versionné** | identifiants Discord locaux (remplis par l'utilisateur) |
| `docs/comptes-rendus/phase-2.md` | modifié | cette section |
| `docs/tasks.md` | modifié | T-2.3 cochée |

**Comment vérifier** (fait le 2026-11-08, sans afficher les valeurs)
1. `supabase/.env` : identifiant de 19 chiffres, secret de 32 caractères, sans espace ni guillemet.
2. `pnpm exec supabase stop` puis `start` : aucune erreur.
3. `GET http://127.0.0.1:54321/auth/v1/settings` → `external.discord: true`.
4. `GET /auth/v1/authorize?provider=discord` → redirection 302 vers `discord.com/api/oauth2/authorize`, avec `redirect_uri=http://127.0.0.1:54321/auth/v1/callback`.
- La vraie connexion de bout en bout est vérifiée en T-2.4.

**Tests** : pas de code ; vérifications ci-dessus. `pnpm db:test` ✅ et `pnpm test` ✅ inchangés.

**Écarts avec les documents** : aucun.

**Hors périmètre, non fait**
- La connexion **par e-mail** reste activée par défaut en local (`external.email: true`), alors que R-ACC-01 fait de Discord la seule méthode. La désactiver (`[auth.email] enable_signup = false` en local, et le même réglage dans le tableau de bord cloud) serait cohérent. Sans risque immédiat (un compte e-mail n'a aucun accès sans compte RT-Dash actif, R-ACC-02), mais à décider avec toi.

**Points ouverts** : voir ci-dessus.

**Relecture**
- [x] Configuration relue.

---

## T-2.4 — Flux de connexion Discord · 2026-11-08

**Ce qui a été fait**
- **`proxy.ts`** : rafraîchit la session (modèle `@supabase/ssr`, `getClaims()` qui vérifie la signature du jeton) ; sans session, renvoie vers `/login`, sauf pour `/login`, `/auth/login`, `/auth/callback` et `/api/health`. Les cookies renouvelés suivent aussi la redirection. La CSP avec nonce de T-1.6 est conservée. Les rôles ne sont **pas** vérifiés ici (design § 5.3).
- **Page `/login`** (hors maquette, calquée sur la carte de la maquette `Acces`) : logo blanc, « Connexion », bouton en pilule « Se connecter avec Discord », message d'erreur si la connexion échoue.
- **`/auth/login`** (GET) : demande à Supabase l'adresse Discord (scope `identify`, L-03) puis y envoie l'utilisateur. C'est un **lien** et non un formulaire, car la CSP `form-action 'self'` bloquerait la redirection d'un formulaire vers Discord. Un tiers ne peut pas imposer une session : le code PKCE est gardé dans un cookie du navigateur.
- **`/auth/callback`** : échange le code contre une session, puis accueil ; sans code, ou en cas d'échec, `/login?erreur=connexion`. L'appel à `sync_my_profile()` viendra en T-3.4.
- **`/auth/logout`** (POST seulement) : ferme la session, puis `/login`.
- **`discordIdentityOf(user)`** (L-01) : ID Discord, pseudo et nom affiché lus dans `identities` (`provider = 'discord'`), **jamais** dans `user_metadata` (un test le vérifie avec un `user_metadata` falsifié). Champs relevés sur ta vraie connexion, **noms seulement, sans les valeurs** : `provider_id` = `sub` = ID Discord (19 chiffres), `full_name` = pseudo, `name` = pseudo + `#0`, `custom_claims.global_name` = nom affiché.
- **`/api/health`** : 200 `{status:"ok", supabase:"ok"}` si Supabase Auth répond en moins de 3 s, sinon 503 `{status:"error", supabase:"unreachable"}`.
- **Accueil provisoire** : « Connecté avec Discord en tant que <pseudo> » et bouton « Se déconnecter » (remplacé en phases 3 et 4).
- **Essai réel le 2026-11-08** : connexion avec ton compte Discord sur Supabase local → l'accueil affiche ton pseudo ; « Se déconnecter » → retour sur `/login`, et `/` y renvoie de nouveau.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `src/proxy.ts` | modifié | rafraîchissement de la session et redirection vers `/login` ; fichiers `brand/` exclus (sinon le logo de `/login` est redirigé) |
| `src/core/supabase/session-proxy.ts` | créé | client Supabase du proxy et cookies renouvelés |
| `src/core/supabase/auth-session.ts` | créé | démarrer la connexion Discord, échanger le code, déconnecter, lire l'utilisateur |
| `src/core/supabase/supabase-health.ts` | créé | santé de Supabase pour `/api/health` |
| `src/core/supabase/supabase-config.ts` | modifié | utilise la lecture commune des variables |
| `src/core/config/read-required-env.ts`, `app-url.ts` | créés | variables obligatoires, `APP_URL` |
| `src/core/auth/public-paths.ts`, `auth-urls.ts`, `discord-identity.ts` | créés | pages publiques, adresses de `/login`, identité Discord |
| `src/app/auth/login/route.ts`, `callback/route.ts`, `logout/route.ts` | créés | les trois étapes du flux |
| `src/app/(public)/login/page.tsx`, `login.module.css` | créés | page de connexion |
| `src/app/globals.css` | créé | sous-ensemble des tokens du design § 10 (mêmes noms et valeurs) |
| `src/app/layout.tsx` | modifié | importe `globals.css` |
| `src/app/page.tsx` | modifié | accueil provisoire avec pseudo et déconnexion |
| `src/app/api/health/route.ts` | modifié | vérifie Supabase |
| `public/brand/rt-dash-logo-white.png` | créé | logo blanc de `/login` (copie de `docs/design/logos/`) |
| `eslint.config.mjs` | modifié | règle `no-restricted-imports` resserrée sur le client (voir écarts) |
| `vitest.setup.ts` | modifié | nettoyage du DOM entre deux tests (sans lui, deux rendus s'empilaient) |
| `playwright.config.ts` | modifié | l'e2e lance le build de production branché sur Supabase local |
| `tests/support/local-supabase.ts` | déplacé | depuis `tests/integration/support/`, car l'e2e s'en sert aussi |
| `tests/unit/proxy.test.ts`, `tests/unit/core/auth/*.test.ts`, `tests/unit/core/config/app-url.test.ts`, `tests/unit/core/supabase/auth-session.test.ts`, `supabase-health.test.ts`, `tests/unit/app/auth/*/route.test.ts` | créés | tests du flux |
| `tests/unit/app/page.test.tsx`, `tests/unit/app/api/health/route.test.ts` | modifiés | nouvel accueil, nouvelle réponse de santé |
| `tests/e2e/auth.spec.ts` | créé | redirection sans session, départ vers Discord, message d'erreur |
| `tests/e2e/health.spec.ts`, `security-headers.spec.ts` | modifiés | `/` exige maintenant une session : en-têtes et CSP vérifiés sur `/login` (logo compris) |
| `docs/comptes-rendus/captures/phase-2-login.png`, `phase-2-login-erreur.png` | créés | captures à valider |
| `.claude/launch.json` | créé, **pas destiné au commit** sauf avis contraire | lance `pnpm dev` dans l'aperçu de l'application Claude |
| `.env.development.local` | créé, **non versionné** | `APP_URL` et Supabase **local** pour `pnpm dev` |
| `docs/comptes-rendus/phase-2.md`, `docs/tasks.md` | modifiés | cette section, T-2.4 cochée |

**Comment vérifier**
1. `pnpm exec supabase start`, puis `pnpm dev`, puis http://localhost:3000 : redirection vers `/login`.
2. « Se connecter avec Discord » → Discord → retour sur l'accueil avec ton pseudo. « Se déconnecter » → `/login`.
3. `pnpm test` (71 tests), `pnpm test:e2e` (9 tests), `pnpm db:test` (20).

**Tests** : écrits d'abord, échecs constatés (modules absents), puis le code. `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ (71) · `pnpm test:e2e` ✅ (9) · `pnpm db:test` ✅ (20) · connexion et déconnexion réelles ✅

**Écarts avec les documents**
- **Règle ESLint `no-restricted-imports`** : en T-1.1, elle interdisait tout `@/core/supabase/*` hors des dossiers autorisés, donc aussi les fonctions qui n'exposent pas le client (santé, connexion). Elle vise désormais **le client lui-même** : `@supabase/*` et `@/core/supabase/server-client`, ce qui suit le texte du design § 3.2 (« client Supabase interdit hors… »). Contrôlé : un import du client dans `src/app/` est toujours refusé. **À valider.**
- **Connexion par un lien (GET)** au lieu d'une action serveur (design § 5.2) : la CSP bloquerait la redirection d'un formulaire vers Discord, et une Server Action devrait passer par `defineAction` (phase 3), alors qu'aucun droit n'existe avant la connexion.
- **`next/image` remplacé par `<img>`** sur `/login` : `next/image` ajoute un attribut `style` en ligne, refusé par la CSP stricte en production (test e2e en échec). Exception ESLint commentée. Même question à prévoir en phase 4.
- `globals.css` ne contient pour l'instant que les tokens utiles à `/login`, avec les noms et valeurs du design § 10. La police Plus Jakarta Sans et Tailwind arrivent en T-4.1.
- Textes de `/login` (« Connexion », « Connectez-vous avec votre compte Discord. », « La connexion avec Discord a échoué. Réessayez. ») : proposés, écran hors maquette → **captures à valider**.

**Hors périmètre, non fait** : aucun.

**Points ouverts / questions**
- `/api/health` répond 503 si Supabase est injoignable. Le `HEALTHCHECK` de l'image marquera alors le conteneur « unhealthy », et Caddy ne démarrera pas tant que l'app n'est pas saine (`depends_on: service_healthy`, T-1.8). C'est voulu, mais à savoir lors d'une panne de Supabase.
- `pnpm dev` affiche des violations de CSP pour des styles en ligne : elles viennent des outils de développement de Next et n'existent pas en production (vérifié par l'e2e).
- Ton ancien `.env.local` (première tentative, jamais lu) est toujours chargé par `pnpm dev`, mais `.env.development.local` est prioritaire pour les variables utilisées. Tu peux le supprimer quand tu veux.

**Relecture**
- [x] Code relu comme un nouveau venu le lirait (design § 3.2) ; fonctions courtes, logique pure testée à part.

---

## T-2.5 — CI : Supabase local, tests de la base, types à jour · 2026-11-08

**En clair** : la CI compte maintenant **quatre** vérifications. La nouvelle, « Base de données et tests d'intégration », lance un vrai Supabase local sur la machine de GitHub (comme sur ton poste, L-07), rejoue toutes les migrations depuis zéro, lance les tests pgTAP et les tests d'intégration, puis régénère les types TypeScript et échoue s'ils diffèrent de ceux du dépôt (quelqu'un a changé la base sans lancer `pnpm db:types`).

**Ce qui a été fait**
- Job « Qualité… » : `pnpm test` devient `pnpm test:unit` (les tests d'intégration ont besoin de Supabase, ils passent dans le nouveau job).
- Nouveau job `database` : `supabase start` → `pnpm db:reset` → `pnpm db:test` → `pnpm test:integration` → `pnpm db:types` puis `git diff --exit-code` sur `database.types.ts`.
- Job e2e : démarre aussi Supabase local, car le proxy et `/api/health` en ont besoin depuis T-2.4.
- Supabase est lancé **sans** les services inutiles aux tests (Realtime, Studio, e-mails, fonctions, journaux…) : 19 s en local au lieu de plusieurs minutes. La liste est écrite une seule fois (`SUPABASE_UNUSED_SERVICES`).
- La CLI est celle du projet (`pnpm exec supabase`, 3.0.0) : même version qu'en local et que dans `deploy.yml`. Aucune nouvelle action GitHub, donc rien de plus à épingler (L-05).
- Sans identifiants Discord en CI : vérifié en local que Supabase démarre et que tous les tests passent sans `supabase/.env` (la connexion Discord y est simplement inutilisable).

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `.github/workflows/ci.yml` | modifié | job `database`, Supabase dans l'e2e, tests unitaires seuls dans le job qualité |
| `docs/comptes-rendus/phase-2.md` | modifié | cette section |

**Vérifié en local (2026-11-08)**
- Supabase lancé avec la même liste d'exclusions, sans `supabase/.env` : `db:reset` ✅, `db:test` ✅ (20), `test:integration` ✅ (6), types régénérés **identiques** octet par octet.
- `actionlint` sur `ci.yml` et `deploy.yml` : aucune erreur.

**Sur GitHub (2026-11-08)**
- Commit `3725605` (T-2.1 à T-2.5) : jobs qualité, base de données et e2e **verts** ; job image **rouge**. Cause : `.dockerignore` exclut `tests/`, mais `playwright.config.ts` (qui importe maintenant `tests/support/`) entrait dans le contexte de build, et `next build` vérifie ses types.
- Correctif : `playwright.config.ts` et le dossier `supabase/` exclus du contexte Docker. Le second évite aussi que `supabase/.env` (identifiants Discord locaux) n'entre dans le contexte de build sur le poste ; il n'atteignait pas l'image finale, mais il n'a rien à y faire. Vérifié en local : l'image se construit, ne contient aucun `.env`, `/api/health` répond 200 avec Supabase local et `/` renvoie vers `/login`.
- Avant le push, gitleaks avait signalé un **faux positif** : un ID Discord de 18 chiffres dans un test, pris pour un identifiant d'application Discord. J'avais d'abord mis l'ID réel du superadmin (déjà dans les docs) ; il est remplacé par un ID inventé, marqué `gitleaks:allow` avec la raison. Le commit, pas encore poussé, a été corrigé (`--amend`), donc l'historique publié ne contient pas l'alerte.

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `.dockerignore` | modifié | `playwright.config.ts` et `supabase/` hors du contexte de build |
| `tests/unit/core/auth/discord-identity.test.ts`, `tests/unit/app/page.test.tsx` | modifiés | ID Discord inventé à la place de l'ID réel ; faux positif gitleaks marqué |

**Écarts avec les documents** : aucun.

**Hors périmètre, non fait** : aucun.

**Points ouverts / questions**
- Le nom du nouveau job (« Base de données et tests d'intégration ») devra s'ajouter aux vérifications obligatoires si tu poses un jour la protection de `main`.

**Relecture**
- [x] Workflow relu ; commentaires limités au « pourquoi ».

---

## T-2.6 (première version, Supabase) — interrompue · 2026-11-08

- Écrits et simulés en local, **jamais commités** : `.github/workflows/backup.yml` (`pg_dump` par le pooler Supabase + copie du bucket + `age` + artefact) et `scripts/backup/download-bucket.mts` (+ 6 tests). La simulation complète (dump, copie, chiffrement avec une clé jetable, déchiffrement, image identique) a réussi.
- Bloquée par l'état de la base cloud (migration jamais appliquée, anciens schémas probables), puis **abandonnée** avec Supabase (ci-dessous). Ces fichiers seront supprimés en T-2.1 (nouvelle version) ; l'idée « tout chiffrer avec `age`, rien en clair » est reprise dans la nouvelle T-2.7.
- Dossier de simulation laissé dans le répertoire temporaire de la session (`scratchpad\backup-sim`) : suppression bloquée par une sécurité de l'outil, à effacer à la main.

---

## Changement de cap : abandon de Supabase (décision D-06) · 2026-11-08

**Demande de l'utilisateur** : quitter Supabase pour une pile « plus propre », sans les nombreux services inutilisés. Après comparaison (API NestJS séparée, ou Next.js full-stack + Postgres seul), choix : **Next.js full-stack + Postgres seul, dans Docker**. Une API NestJS ne se justifierait que pour d'autres clients (ex. le bot v2) et pourra s'ajouter plus tard.

**Documents modifiés (révision 1.1, validée le 2026-11-09)**

| Fichier | Ce qui change |
|---|---|
| `docs/design.md` | § 1 (architecture, principes), § 2 (stack : Postgres 17 Docker, Kysely, dbmate, Discord OAuth2, volume), § 3 (arborescence `db/`, `core/db`, `core/files` ; règle ESLint), § 4 (`rtdash.f_unaccent`, chemins), § 5 (configuration Discord, flux OAuth2 + sessions en base, contrôle côté serveur, premier superadmin), § 6 (rôles `rtdash_owner` / `rtdash_app`, identité déduite par la base du jeton de session, fichiers, test « sans session »), § 7 et § 11 (image copiée sur le volume, `pg_cron` dans l'image), § 13 (images, compose avec `db` et `migrate`, variables, changement de VPS, développement local, sauvegardes par SSH), § 14 (CI/CD ; protection de `main` notée comme reportée), § 15 (sessions de test en base, plus d'`E2E_TEST_AUTH`), § 16 (couches 3, 4, 6, 7, 9 ; tests d'attaque), § 17 (Q-T1, Q-T3, Q-T5, P2-a, P2-b, D-05 révisées ; **D-06**), § 18 (L-01 reformulée, L-02 et L-03 sans objet, L-07 adaptée) |
| `docs/tasks.md` | phase 2 réécrite (T-2.1 à T-2.7) ; T-0.2 sans objet ; T-0.3 ; T-1.5 (texte) ; phases 3, 5, 6, 7 et 11 ajustées |
| `CLAUDE.md` | description de la pile, statut, règles de sécurité (rôle `rtdash_app`, `withSession`, ID Discord), chemins des migrations |
| `docs/prompts-phases.md` | prompt de la phase 2 réécrit ; mentions des phases 3, 6 et 11 |
| `docs/specs.md` | § 14.4 ajouté (aucune règle fonctionnelle ne change) |
| `docs/comptes-rendus/phase-2.md` | cette section |

**Propositions à valider en particulier** (marquées **[PROPOSITION]** dans le design)
1. Kysely + `pg` pour l'accès aux données, dbmate pour les migrations, `arctic` pour l'OAuth Discord.
2. L'identité côté base : l'application transmet le **jeton de session** (pas un identifiant) à `rtdash.use_session`, qui le vérifie ; seule l'empreinte SHA-256 est stockée.
3. Sessions de **30 jours** sans prolongation ; purge des sessions expirées depuis 90 jours.
4. Sauvegardes : script sur le VPS qui chiffre avec `age` et envoie le flux chiffré au workflow GitHub par SSH (artefact 30 jours).
5. Tests e2e : sessions créées directement en base ; plus aucune route de connexion de test dans l'application.

**Ce que devient le travail déjà fait**
- Phase 1 : inchangée (Next.js, CSP, Docker, Caddy, CI, Dependabot). `docker-compose.yml`, `.env.example`, `ci.yml` et `deploy.yml` seront adaptés en T-2.1, T-2.5 et T-2.6.
- Phase 2 (version Supabase, commits `3725605` et `6d0f81e`) : T-2.1 à T-2.5 **décochées** dans `tasks.md` (la phase est réécrite). Réutilisable : la migration et le test structurel (à adapter aux nouveaux rôles), la page `/login` et ses captures, le proxy et la CSP, `discordIdentityOf` (à remplacer par la lecture du profil Discord), les tests e2e d'en-têtes et de connexion.
- Projet Supabase cloud (T-0.2) : plus utilisé, à supprimer par l'utilisateur quand il le souhaite. L'application Discord (T-0.3) est conservée.

**Points ouverts**
- Révision 1.1 des documents **validée par l'utilisateur le 2026-11-09**.
- Les données vivront sur le VPS : les sauvegardes (T-2.7, puis T-11.6 et T-11.8) deviennent critiques.

---

# Phase 2, nouvelle version (D-06) — à partir du 2026-11-09

## T-2.1 — Retrait de Supabase et socle de la base · 2026-11-09

**Ce qui a été fait**
- **Supabase retiré** : dépendances (`supabase`, `@supabase/supabase-js`, `@supabase/ssr`), dossier `supabase/` (dont `supabase/.env`, après report des identifiants Discord), `src/core/supabase/`, routes `/auth/*`, `discordIdentityOf`, tests associés, job `database` et démarrage de Supabase dans la CI, étapes Supabase de `deploy.yml`. Supabase local arrêté (ses volumes Docker restent sur le disque). Fichiers non suivis de l'ancienne T-2.6 supprimés.
- **Revenus à leur état de la phase 1** (la connexion revient en T-2.4) : `src/proxy.ts` (CSP seule), `src/app/page.tsx`, `src/app/api/health/route.ts`, leurs tests, `tests/e2e/health.spec.ts`, `playwright.config.ts`. Conservés de la première version : page `/login` et ses captures, `globals.css`, `public/brand/`, `core/config/`, `core/auth/public-paths.ts` (resservira en T-2.4), tests e2e d'en-têtes sur `/login`, nettoyage du DOM entre deux tests.
- **Image de la base** `db/Dockerfile` : `postgres:17.11-bookworm` épinglée par empreinte (publiée le 2026-11-05, L-05) + `postgresql-17-cron` 1.6.8, `postgresql-17-pgtap` 1.3.4 et `pg_prove` ; `pg_cron` chargé au démarrage, tâches dans la base `rtdash`.
- **Initialisation** `db/init/01-database-and-roles.sh` (premier démarrage seulement) : rôles `rtdash_owner` (migrations) et `rtdash_app` (application, `NOBYPASSRLS`), base `rtdash` à `rtdash_owner`, connexion fermée à `PUBLIC`, aucune création possible dans `public` pour l'application, extension `pg_cron` (exige un superutilisateur) avec l'usage du schéma `cron` donné à `rtdash_owner`.
- **`compose.dev.yml`** : la base seule, port publié sur `127.0.0.1` uniquement, mots de passe de développement par défaut ; contrôle de santé **par TCP**, sinon Postgres paraît prêt pendant son initialisation (serveur temporaire sur socket local).
- **Scripts** : `pnpm db:up`, `db:migrate` (dbmate 2.37.0 avec le rôle propriétaire, table de suivi `rtdash.schema_migrations`), `db:reset`, `db:test` (`pg_prove` dans le conteneur), `db:types` (kysely-codegen 0.20.0). Les connexions sont lues dans `.env.development.local` s'il existe (`node --env-file-if-exists`), sinon dans l'environnement (CI).
- **Client** `core/db/client.ts` (Kysely 0.29.8 + `pg` 8.23.1, `server-only`) et `core/db/database-url.ts` : refuse toute `DATABASE_URL` qui n'utilise pas `rtdash_app`.
- **ESLint** : `kysely`, `pg` et `@/core/db/client` interdits hors `core/db`, `queries/` et `actions/` (vérifié avec un fichier jetable : 2 refus) ; le fichier de types généré n'est plus relu par ESLint.
- **`.env.development.local`** (non versionné) réécrit : `APP_URL`, `DATABASE_URL`, `DATABASE_OWNER_URL` (base locale, `sslmode=disable`), et tes identifiants Discord **reportés depuis `supabase/.env` sans être affichés** (19 et 32 caractères).

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `db/Dockerfile`, `db/init/01-database-and-roles.sh` | créés | image et initialisation de la base |
| `db/tests/database-and-roles.test.sql` | créé | pgTAP : rôles, propriétaire, privilèges, `pg_cron` |
| `db/migrations/` | créé (vide) | migrations dbmate (T-2.2) |
| `compose.dev.yml` | créé | base locale |
| `scripts/db/run-dbmate.mjs`, `scripts/db/generate-types.mjs` | créés | dbmate et kysely-codegen avec la bonne connexion ; kysely-codegen lancé sans shell (sous Windows, `cmd` interprète les parenthèses de `env(…)`) |
| `src/core/db/client.ts`, `database-url.ts` | créés | accès à la base |
| `src/core/db/database.types.ts` | créé (généré) | types (vides pour l'instant) |
| `tests/unit/core/db/database-url.test.ts` | créé | rôle imposé, variable absente, mot de passe jamais affiché |
| `tests/integration/db/client.test.ts` | créé | connexion réelle en `rtdash_app`, création de table refusée |
| `vitest.config.mts` | modifié | les tests d'intégration lisent `.env.development.local` (`util.parseEnv` de Node, sans nouvelle dépendance) |
| `package.json`, `pnpm-lock.yaml` | modifiés | dépendances et scripts `db:*` |
| `eslint.config.mjs`, `.prettierignore` | modifiés | client de la base, fichier généré |
| `.dockerignore` | modifié | `db/` et `compose.dev.yml` hors du contexte de l'image de l'application |
| `.github/workflows/ci.yml`, `deploy.yml` | modifiés | étapes Supabase retirées (base en CI : T-2.5 ; migrations par SSH : T-2.6) |
| `README.md` | modifié | pile, base locale, scripts |
| fichiers Supabase listés plus haut | supprimés | retrait de Supabase |
| `src/proxy.ts`, `src/app/page.tsx`, `src/app/api/health/route.ts`, `playwright.config.ts`, `tests/e2e/health.spec.ts`, `tests/unit/app/page.test.tsx`, `tests/unit/app/api/health/route.test.ts` | rétablis | état de la phase 1 |
| `docs/design.md`, `docs/tasks.md`, `CLAUDE.md`, `docs/comptes-rendus/phase-2.md` | modifiés | révision 1.1 marquée validée ; cette section |

**Comment vérifier**
1. `pnpm db:up` puis `pnpm db:test` : 9 tests, `Result: PASS`.
2. `pnpm db:types` : régénère `src/core/db/database.types.ts`.
3. `pnpm test` (36 tests, dont 2 d'intégration sur la base locale), `pnpm test:e2e` (6 tests).

**Tests** : `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ (36) · `pnpm db:test` ✅ (9) · `pnpm test:e2e` ✅ (6) · `actionlint` ✅

**Écarts avec les documents**
- **`db:reset` et `db:migrate`** : dbmate refuse de tourner sans aucune migration ; vérifiés de bout en bout avec la première migration (T-2.2, 2026-11-09). T-2.1 cochée à ce moment-là.
- URL de connexion avec `sslmode=disable` : dbmate exige TLS par défaut ; la base n'est joignable qu'en local ou par le réseau Docker interne (design § 6.1).
- Les paquets `pg_cron` et pgTAP ne sont pas épinglés à une version précise (dépôt PGDG) ; l'image de base, elle, l'est.

**Hors périmètre, non fait**
- `.env.example` mentionne encore Supabase : il est réécrit en T-2.6 avec les variables de production (design § 13.3).

**Points ouverts**
- Les volumes Docker de Supabase local (`supabase_*_rt-dash`) et ton ancien `.env.local` restent sur ta machine ; tu peux les supprimer quand tu veux.

**Relecture**
- [x] Code relu ; commentaires limités au « pourquoi ».

---

## T-2.2 — Première migration, droits par défaut fermés · 2026-11-09

**Ce qui a été fait**
- **Test d'abord** : test structurel pgTAP (20 vérifications), repris de la première version et adapté aux rôles `rtdash_owner` / `rtdash_app`. Il échoue si : une table de `public` n'a pas la RLS ; `PUBLIC` a un droit sur une table, une vue, une séquence ou une fonction ; `rtdash_app` a `DELETE` ou `TRUNCATE`, possède un objet, accède directement à une table interne (`rtdash`), ou peut modifier une colonne protégée ; une fonction `security definer` n'a pas de `search_path`. Il crée aussi, avec le rôle `rtdash_owner`, une table, une séquence et une fonction « sondes » et vérifie qu'elles naissent sans aucun droit. Plus : extensions, `rtdash.f_unaccent`, types `enum`, schéma `rtdash` fermé.
- Échecs constatés avant la migration (schéma `rtdash` absent, extensions absentes, fonction sonde exécutable par `PUBLIC`).
- **Migration** `db/migrations/20261109073930_foundation.sql` (dbmate) : droit d'exécution implicite de `PUBLIC` retiré pour toutes les fonctions de `rtdash_owner` ; schéma `extensions` avec `pg_trgm` et `unaccent` ; `pg_cron` (déjà installé par l'initialisation) ; schéma `rtdash` fermé ; types `app_role`, `ticket_status`, `data_source` ; `rtdash.f_unaccent`.
- **Contre-épreuve** : sans la ligne des droits par défaut, les tests 3 et 11 échouent ; migration remise à l'identique ensuite.
- dbmate range sa table de suivi dans `rtdash.schema_migrations` (propriétaire `rtdash_owner`), fermée à `rtdash_app` (test 8).

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `db/migrations/20261109073930_foundation.sql` | créé | la migration |
| `db/tests/structure.test.sql` | créé | test structurel (design § 6.6) |
| `src/core/db/database.types.ts` | régénéré | inchangé : kysely-codegen ne produit les `enum` qu'avec les tables qui les utilisent |
| `docs/comptes-rendus/phase-2.md`, `docs/tasks.md` | modifiés | cette section ; T-2.1 et T-2.2 cochées |

**Comment vérifier** : `pnpm db:reset` (applique la migration) puis `pnpm db:test` : 2 fichiers, 29 tests, `Result: PASS`.

**Tests** : `pnpm db:test` ✅ (29) · `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ (36)

**Écarts avec les documents**
- Les droits par défaut ne sont retirés que pour les **fonctions** : dans un Postgres sans Supabase, tables et séquences naissent déjà sans droit pour les autres rôles. Les sondes du test le prouvent pour les trois.
- `pg_trgm` et `unaccent` sont rangées dans un schéma `extensions`, pour que `public` ne contienne que nos objets.
- Le test 2 ignore les objets d'extensions (comme le test 3), car pgTAP, installé pour le test, ajoute deux vues ouvertes dans `public`.

**Hors périmètre, non fait** : aucun. **Points ouverts** : aucun.

**Relecture**
- [x] Migration et tests relus ; commentaires limités au « pourquoi ».

---

## T-2.3 — Sessions en base · 2026-11-09

**Ce qui a été fait**
- **Tests d'abord** : pgTAP `db/tests/sessions.test.sql` (18 tests, joués avec le rôle `rtdash_app`) : ouverture ; seule l'empreinte SHA-256 est stockée et le jeton n'apparaît nulle part ; durée de 30 jours ; table illisible par l'application ; jeton valide accepté, inventé, absent, fermé ou expiré refusé ; fermer une session ne touche pas aux autres ; jeton trop court et ID Discord invalide refusés ; purge des seules sessions expirées depuis plus de 90 jours ; purge programmée par `pg_cron`. Intégration `tests/integration/db/session-store.test.ts` (4 tests) sur la vraie base. Échecs constatés avant le code.
- **Migration** `20261109074220_sessions.sql` : table interne `rtdash.sessions` ; `open_session` et `close_session` (`security definer`) ; `rtdash.use_session` (retient le jeton pour la transaction s'il est valide) ; `rtdash.current_session()` (revérifie le jeton à chaque appel) ; `current_discord_profile()` (pseudo de la session, pour « Vous n'avez pas accès ») ; `rtdash.purge_expired_sessions()` programmée chaque jour à 03:00 (UTC). Droits accordés un par un à `rtdash_app`.
- **Application** : `generateSessionToken()` (32 octets aléatoires, base64url) ; `withSession(token, fn)` (transaction qui commence par `rtdash.use_session`) ; `openSession`, `closeSession`, `readSessionProfile`.
- Le test structurel (T-2.2) reste vert avec ces nouveaux objets : table interne fermée à `rtdash_app`, fonctions `security definer` avec `search_path`, rien d'exécutable par `PUBLIC`.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `db/migrations/20261109074220_sessions.sql` | créé | sessions en base |
| `db/tests/sessions.test.sql` | créé | pgTAP des sessions |
| `src/core/auth/session-token.ts`, `discord-profile.ts` | créés | jeton de session, type du profil Discord |
| `src/core/db/with-session.ts`, `session-store.ts` | créés | transaction portant la session ; ouverture, lecture, fermeture |
| `tests/unit/core/auth/session-token.test.ts`, `tests/integration/db/session-store.test.ts` | créés | tests |
| `docs/comptes-rendus/phase-2.md` | modifié | cette section |

**Comment vérifier** : `pnpm db:reset`, `pnpm db:test` (3 fichiers, 47 tests), `pnpm test` (42 tests dont 6 d'intégration).

**Tests** : `pnpm db:test` ✅ (47) · `pnpm test` ✅ (42) · `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅

**Écarts avec les documents**
- `current_discord_profile()` est ajoutée pour lire le pseudo de la session avant que les comptes RT-Dash existent ; `current_viewer()` (phase 3) s'appuiera sur la même session.
- Le test « sans session » du design § 6.6 (aucune ligne **métier** lisible) n'a pas encore d'objet : il n'existe aucune table métier. Il sera écrit avec les premières tables (T-3.1).

**🧑 À faire par l'utilisateur** : ajouter la redirection `http://localhost:3000/auth/callback` dans l'application Discord (nécessaire pour l'essai réel de T-2.4). Les identifiants Discord sont déjà dans `.env.development.local` (reportés en T-2.1).

**Relecture**
- [x] Migration et code relus ; commentaires limités au « pourquoi ».

---

## T-2.4 — Connexion Discord · 2026-11-09

**Ce qui a été fait**
- **`/auth/login`** (lien GET) : crée `state` et code PKCE (`arctic` 3.7.0), les garde 10 minutes dans un cookie `httpOnly`, puis envoie vers `discord.com/oauth2/authorize` avec le seul scope `identify` (aucun e-mail).
- **`/auth/callback`** : relit la tentative et refuse un `state` différent ou un retour sans cookie ; échange le code (secret côté serveur), lit `GET /users/@me` (`id`, `username`, `global_name`), **oublie le jeton Discord**, ouvre la session en base et pose le cookie `__Host-rtdash_session` (`httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 30 jours). La tentative est effacée dans tous les cas (usage unique). En cas d'échec : `/login?erreur=connexion`.
- **`/auth/logout`** (POST) : ferme la session **en base** puis efface le cookie. Un cookie `__Host-` ne s'efface que si l'ordre d'effacement reprend `Secure` et `Path=/`, ce que `cookies.delete()` de Next ne fait pas : les deux cookies sont donc effacés avec les options de leur création (tests à l'appui).
- **`proxy.ts`** : sans cookie de session, redirection vers `/login` (pages publiques : `/login`, `/auth/login`, `/auth/callback`, `/api/health` ; fichiers `brand/` exclus). Il ne valide ni la session ni les rôles. CSP inchangée.
- **`/api/health`** : 200 `{status:"ok", database:"ok"}` si la base répond en moins de 3 s, sinon 503.
- **Accueil provisoire** : pseudo de la session (lu par la base) et bouton « Se déconnecter ». Page `/login` reprise de la première version.
- **E2E** : la connexion de test crée la session **directement en base** (rôle propriétaire) ; l'application n'a aucune route de test (design § 15).
- **Essai réel le 2026-11-09** : 🧑 redirection `http://localhost:3000/auth/callback` ajoutée par l'utilisateur dans l'application Discord ; connexion avec son compte → l'accueil affiche son pseudo ; une session active en base, ID Discord valide (valeurs non affichées). « Se déconnecter » → `/login`, session **fermée** en base, `/` renvoie de nouveau vers `/login`.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `src/core/auth/discord-oauth.ts` | créé | départ vers Discord, échange du code, lecture du profil |
| `src/core/auth/discord-user.ts` | créé | lecture et contrôle de la réponse `/users/@me` |
| `src/core/auth/login-attempt.ts` | créé | `state` + PKCE dans un cookie, vérification au retour |
| `src/core/auth/session-cookie.ts` | créé | nom et options des cookies (création, effacement) |
| `src/core/auth/current-session.ts` | créé | jeton et profil de la session de la requête |
| `src/core/auth/auth-urls.ts` | créé | adresses d'accueil et de `/login` |
| `src/core/db/database-health.ts` | créé | santé de la base |
| `src/app/auth/login/route.ts`, `callback/route.ts`, `logout/route.ts` | créés | les trois étapes |
| `src/proxy.ts`, `src/app/page.tsx`, `src/app/api/health/route.ts` | modifiés | redirection sans session, accueil, santé de la base |
| `tests/unit/core/auth/discord-user.test.ts`, `login-attempt.test.ts`, `tests/unit/app/auth/*/route.test.ts`, `tests/unit/proxy.test.ts` | créés | tests du flux |
| `tests/unit/app/page.test.tsx`, `tests/unit/app/api/health/route.test.ts` | modifiés | accueil, santé |
| `tests/integration/db/database-health.test.ts` | créé | santé sur la vraie base |
| `tests/e2e/auth.spec.ts` | créé | redirection, départ vers Discord, erreur, parcours complet avec session en base |
| `tests/e2e/health.spec.ts` | modifié | nouvelle réponse |
| `tests/support/local-env.ts` | créé | lecture de `.env.development.local`, partagée par Vitest et Playwright |
| `playwright.config.ts`, `vitest.config.mts` | modifiés | connexions de test ; identifiant Discord factice si absent (CI), aucun vrai secret |
| `package.json`, `pnpm-lock.yaml` | modifiés | `arctic` |
| `docs/comptes-rendus/phase-2.md`, `docs/tasks.md` | modifiés | cette section, T-2.4 cochée |

**Comment vérifier**
1. `pnpm db:up`, `pnpm dev`, http://localhost:3000 → `/login` → « Se connecter avec Discord » → accueil avec ton pseudo → « Se déconnecter » → `/login`.
2. `pnpm test` (69), `pnpm test:e2e` (10), `pnpm db:test` (47).

**Tests** : écrits d'abord, échecs constatés, puis le code. `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm format:check` ✅ · `pnpm test` ✅ (69) · `pnpm test:e2e` ✅ (10) · `pnpm db:test` ✅ (47) · connexion et déconnexion réelles ✅

**Écarts avec les documents**
- Dans le test e2e, le cookie de session est posé avec `domain` + `path` : Playwright refuse un cookie `Secure` posé par `url` sur `http://localhost`. Vérifié à part que le navigateur accepte bien le cookie `__Host-` posé par le serveur sur `localhost` (le vrai flux).
- Le jeton d'accès Discord n'est pas révoqué auprès de Discord après usage, seulement oublié (il expire de lui-même). Le révoquer coûterait un appel de plus à chaque connexion ; à décider si tu le souhaites.

**Hors périmètre, non fait** : aucun.

**Points ouverts**
- Captures de `/login` (écran hors maquette) toujours à valider : `docs/comptes-rendus/captures/phase-2-login.png` et `phase-2-login-erreur.png`.

**Relecture**
- [x] Code relu comme un nouveau venu le lirait ; fonctions courtes, logique pure testée à part.

---

## T-2.5 — CI avec la base · 2026-11-09

**En clair** : la CI compte de nouveau **quatre** vérifications. « Base de données et tests d'intégration » construit l'image `db/`, rejoue toutes les migrations sur une base vide, lance pgTAP et les tests d'intégration, puis régénère les types et échoue s'ils diffèrent de ceux du dépôt. L'e2e tourne sur le build de production branché sur cette base. Les **deux** images (application et base) sont scannées par Trivy, et `deploy.yml` publie aussi l'image de la base sur GHCR (`rt-dash-db`).

**Ce qui a été fait**
- `ci.yml` : connexions de test au niveau du workflow (mots de passe de développement de `compose.dev.yml`, sans valeur ailleurs ; gitleaks : aucune fuite) ; nouveau job `database` (`pnpm db:up`, `db:migrate`, `db:test`, `test:integration`, contrôle des types) ; base démarrée dans le job e2e ; scan Trivy de l'image de la base.
- `deploy.yml` : publication de `ghcr.io/<owner>/rt-dash-db:<sha>` et `:latest` à côté de l'image de l'application.
- **Trouvé par le scan** : l'image officielle `postgres` contient `gosu`, petit binaire Go compilé avec une version ancienne de Go (26 failles HIGH/CRITICAL de la bibliothèque standard Go). `gosu` ne sert qu'à quitter root au démarrage. **Correctif** plutôt qu'exception : le conteneur tourne directement en `USER postgres` et `gosu` est supprimé. La base ne tourne donc plus jamais en root. Vérifié : processus 1 en uid 999 (`postgres`), base recréée, 47 tests pgTAP verts, Trivy sans aucune faille.

**Fichiers créés ou modifiés**

| Fichier | Créé / modifié | Pourquoi |
|---|---|---|
| `.github/workflows/ci.yml` | modifié | job `database`, base dans l'e2e, scan de l'image de la base |
| `.github/workflows/deploy.yml` | modifié | publication de l'image de la base |
| `db/Dockerfile` | modifié | `USER postgres`, `gosu` retiré |
| `.gitleaks.toml` | créé | règles par défaut de gitleaks + exception nominative et datée pour les ID Discord **inventés** des tests (`123456789012345678`, `223456789012345678`), pris à tort pour des identifiants d'application. Contre-essai : un faux jeton GitHub aléatoire est toujours détecté. |
| `docs/comptes-rendus/phase-2.md` | modifié | cette section |

**Vérifié en local (2026-11-09)** : séquence du job `database` rejouée depuis une base vide (2 migrations, pgTAP ✅, intégration ✅ 7 tests, types régénérés identiques) ; Trivy sur les deux images ✅ ; `actionlint` ✅ ; gitleaks sur `.github/` ✅.

**Reste à vérifier sur GitHub** : après le commit. **T-2.5 sera cochée une fois les quatre jobs verts.**

**Écarts avec les documents** : `USER postgres` et le retrait de `gosu` ne sont pas décrits au design § 13.1 ; ils en renforcent l'esprit (comme l'utilisateur non root de l'image de l'application).

**Hors périmètre, non fait** : aucun.

**Points ouverts** : le nouveau job s'appellera « Base de données et tests d'intégration » et le job des images « Images Docker et scan Trivy » (à reprendre si la protection de `main` est posée un jour).

**Relecture**
- [x] Workflows et Dockerfile relus.

---
