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

**Reste à vérifier sur GitHub** : la CI ne tourne qu'après un push, donc après ton accord pour commiter. **T-2.5 sera cochée une fois les quatre jobs verts sur GitHub.**

**Écarts avec les documents** : aucun.

**Hors périmètre, non fait** : aucun.

**Points ouverts / questions**
- Le nom du nouveau job (« Base de données et tests d'intégration ») devra s'ajouter aux vérifications obligatoires si tu poses un jour la protection de `main`.

**Relecture**
- [x] Workflow relu ; commentaires limités au « pourquoi ».

---
