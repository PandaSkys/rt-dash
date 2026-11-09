# RT-Dash — Design technique

> Statut : **RÉVISION 1.1 du 2026-11-08, validée le 2026-11-09** (révision 1.0 du 2026-11-02 ; version 0.5 validée le 2026-10-15).
> Changements de la 1.1 (décision D-06) : **Supabase abandonné**. Postgres seul dans Docker, accès par Kysely, connexion Discord et sessions gérées par l'application, fichiers sur un volume Docker (§ 1, 2, 3, 5, 6, 7, 11, 13, 14, 15, 16, 17, 18). Le schéma, les règles et la méthode ne changent pas.
> Changements de la 1.0 : Supabase « classique » à la place de Drizzle, conventions de code (§ 3.2), comptes rendus et périmètre strict (§ 17), leçons de la première tentative (§ 18).
> Documents liés : [specs.md](specs.md) (règles `R-…`, questions `Q-…`) · [tasks.md](tasks.md) · [../CLAUDE.md](../CLAUDE.md)

Références visuelles à garder ouvertes : [`design/reference-dashboard.png`](design/reference-dashboard.png) (structure et style), [`design/maquette/`](design/maquette/) (valeurs exactes), [`design/discord/`](design/discord/) (message réel, image et source), [`design/logos/`](design/logos/).

**[PROPOSITION]** marque un choix technique proposé par Claude puis validé avec le document.

---

## 1. Vue d'ensemble

```
                ┌─────────────────────────────── VPS (Docker Compose) ───────────────────────────────┐
 Navigateur ─HTTPS─▶ Caddy (TLS auto) ─▶ app : Next.js (Server Components, Server Actions, routes)   │
                │                          │  Kysely, côté serveur uniquement, chaque transaction     │
                │                          │  porte la session de l'utilisateur          volume :     │
                │                          ▼                                              images de    │
                │                    db : Postgres 17 (réseau interne seulement)          trajet       │
                │                    RLS par droit, fonctions SQL, triggers d'audit, pg_cron           │
                └─────────────────────────────────────────────────────────────────────────────────────┘
        app ──▶ Discord (OAuth2, connexion)      app ──▶ API TruckersMP (api.truckersmp.com/v2)
```

Principes :
1. **Une seule application, une base, rien d'inutile** (D-06) : Next.js full-stack et Postgres, chacun dans son conteneur. Le navigateur ne parle qu'à Next.js ; la base n'est jamais exposée hors du réseau Docker. Aucune variable `NEXT_PUBLIC_*`, et **la même image Docker de l'application pour tous les environnements**.
2. **Deux barrières de sécurité** : (a) Next.js vérifie le droit avant chaque action (`defineAction`, § 16) ; (b) Postgres le revérifie avec ses **règles RLS**, car chaque transaction porte la session de l'utilisateur (§ 6.1). Une erreur dans l'une est rattrapée par l'autre.
3. **La base garantit les règles critiques** : interdiction de supprimer, archives figées, motif de refus obligatoire, historique automatique. L'auteur de chaque modification est **déduit par la base de la session** (jeton de session vérifié en base), jamais d'un identifiant envoyé par le code ; il ne peut donc pas être choisi librement.
4. **L'application n'a que les droits dont elle a besoin** : elle se connecte avec un rôle Postgres restreint (`rtdash_app`), soumis à la RLS, sans droit de modifier le schéma. Les migrations utilisent un autre rôle (`rtdash_owner`).
5. **Les outils sont des modules** déclarés dans un registre (§ 3.1). La coque (barre latérale, accueil, recherche, notifications) se construit à partir de ce registre.
6. **Une seule fonction pure génère le message Discord** (§ 9). L'aperçu v1 et le bot v2 l'utilisent tous les deux.
7. **Le code est découpé et lisible par un humain** (§ 3.2) : petits composants, hooks, logique métier pure à part, accès aux données isolé.

---

## 2. Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Langage | TypeScript (strict) | Imposé. |
| Framework | **Next.js**, dernière version stable, App Router, `output: "standalone"` | Imposé (full-stack). Le mode standalone produit une image Docker légère. |
| Runtime | Node.js LTS (24) | Base des images Docker officielles. |
| Base de données | **PostgreSQL 17 dans Docker** (image `db/` : image officielle + `pg_cron` + pgTAP), sur le VPS, réseau interne uniquement (D-06) | Une base, rien d'autre. Données sur un volume Docker, sauvegardées chaque jour (§ 13.6). |
| Accès aux données | **Kysely** + `pg` (node-postgres), côté serveur uniquement **[PROPOSITION]** | Requêtes SQL typées, sans « magie » ni couche cachée ; les fonctions SQL s'appellent comme des requêtes. Pas d'ORM. |
| Migrations et types | **dbmate** (fichiers SQL `db/migrations/*.sql`) **[PROPOSITION]** ; types par **kysely-codegen** (`pnpm db:types`) | SQL pur, un seul outil en local, en CI et en production ; types générés depuis la base, jamais écrits à la main. |
| Authentification | **Discord OAuth2** géré par l'application (code + `state` + PKCE, bibliothèque `arctic` **[PROPOSITION]**), sessions en base | Imposé (Discord uniquement). Scope `identify` seul : aucun e-mail. |
| Fichiers | Volume Docker `route-images`, servi par une route qui vérifie le droit | Images de trajet. |
| UI | Tailwind CSS v4 + **shadcn/ui** (Radix) + `lucide-react` | Imposé (shadcn). Les icônes de la maquette sont des tracés Lucide. |
| Formulaires | React Hook Form + Zod | Validation partagée entre client et serveur ; `watch()` alimente l'aperçu en direct. |
| Dates | `date-fns` + `@date-fns/tz`, plus `Intl.DateTimeFormat('fr-FR')` | Conversion UTC ↔ Europe/Paris avec changement d'heure (R-TIME-02). |
| Recherche (UI) | Composant `Command` de shadcn (cmdk) | Palette façon Spotlight (R-SRC-01). |
| Graphique | Composant `Chart` de shadcn (Recharts) | Graphique d'activité (R-DSH-02). |
| Emojis de l'aperçu | Twemoji | Rendu identique à Discord. Licence CC-BY 4.0 : attribution dans « À propos ». |
| Tests | Vitest, Testing Library, Playwright, **pgTAP** (`pnpm db:test`, `pg_prove` dans l'image de la base) | § 15. |
| Qualité | ESLint (règles de lisibilité du § 3.2, zéro avertissement toléré), Prettier, `tsc --noEmit` | Lancés par la CI. |
| Gestionnaire de paquets | pnpm | Rapide, fichier de verrouillage strict. |
| Conteneurs | Docker + Docker Compose, Caddy | Imposé ; Caddy gère le HTTPS automatiquement. |
| CI/CD | GitHub Actions + GitHub Container Registry (GHCR) | § 14. |

---

## 3. Structure du dépôt, registre d'outils et conventions de code

### 3.0 Arborescence

```
RT-Dash/
├─ CLAUDE.md
├─ docs/
│  ├─ specs.md · design.md · tasks.md · prompts-phases.md
│  ├─ comptes-rendus/           un fichier par phase : phase-1.md, phase-2.md… (modèle : _modele.md)
│  └─ design/                   ressources visuelles et fichiers de référence
├─ db/
│  ├─ Dockerfile                image Postgres 17 + pg_cron + pgTAP (local, CI, production)
│  ├─ init/                     création des rôles et de la base au premier démarrage du conteneur
│  ├─ migrations/               SQL versionné (dbmate) : tables, RLS, droits, fonctions, triggers, cron
│  ├─ tests/                    tests pgTAP (RLS par rôle, triggers, structure) → `pnpm db:test`
│  └─ seed.sql                  données du développement local uniquement
├─ src/
│  ├─ app/                      routes Next.js : pages FINES qui chargent les données et assemblent des composants
│  │  ├─ (public)/login/page.tsx
│  │  ├─ auth/callback/route.ts
│  │  ├─ acces-refuse/page.tsx
│  │  ├─ (app)/layout.tsx       garde d'accès + coque (AppShell)
│  │  ├─ (app)/page.tsx         accueil = dashboards des outils accessibles
│  │  ├─ (app)/convois/…  (app)/villes/…  (app)/parametres/…
│  │  ├─ api/health/route.ts
│  │  └─ globals.css            TOKENS DE DESIGN (§ 10)
│  ├─ core/                     socle partagé, sans logique d'outil
│  │  ├─ db/                    client.ts (pool, transaction avec la session) · database.types.ts (généré)
│  │  ├─ auth/                  discord-oauth.ts · session-cookie.ts · get-viewer.ts · require-permission.ts
│  │  ├─ files/                 stockage des images de trajet (volume)
│  │  ├─ actions/               define-action.ts · action-result.ts
│  │  ├─ permissions/           roles.ts · permissions.ts · user-admin-rules.ts
│  │  ├─ tools/                 types.ts · registry.ts
│  │  ├─ search/ · notifications/ · time/ · cities/
│  ├─ components/
│  │  ├─ ui/                    primitives shadcn (thémées par les tokens)
│  │  └─ layout/                AppShell.tsx · Sidebar.tsx · SidebarNavItem.tsx · PageHeader.tsx …
│  ├─ admin/users/              administration des comptes (même découpage qu'une fonctionnalité d'outil)
│  └─ tools/
│     ├─ index.ts               liste des outils (registre)
│     └─ convois/
│        ├─ manifest.ts         déclaration de l'outil
│        ├─ tickets/            une fonctionnalité = un dossier, découpé comme ci-dessous
│        │  ├─ components/      TicketsTable.tsx · TicketRow.tsx · StatusTabs.tsx · AddTicketForm.tsx …
│        │  ├─ hooks/           use-ticket-filters.ts …
│        │  ├─ actions/         add-ticket.ts · take-ticket.ts … (une Server Action par fichier)
│        │  ├─ queries/         list-tickets.ts · get-ticket.ts (lectures côté serveur)
│        │  └─ domain/          logique pure testable : statuts, schémas Zod, formatage
│        ├─ convoys/ · cities/ · settings/ · dashboard/     (même découpage)
│        ├─ discord/            domain/build-message.ts · components/DiscordMessagePreview/…
│        └─ truckersmp/         client.ts · schema.ts · parse-url.ts · mapping.ts · diff.ts
├─ tests/                       unit/ (miroir de src/) · integration/ · e2e/ · fixtures/
├─ scripts/                     cities/ (import des villes) · vps/ (préparation du serveur)
├─ public/brand/                copies des logos
├─ Dockerfile · docker-compose.yml · Caddyfile · .env.example
└─ .github/                     workflows/ci.yml · deploy.yml · backup.yml · dependabot.yml
```

### 3.1 Registre d'outils (R-TOOL-01..03)

```ts
// src/core/tools/types.ts
export interface ToolManifest {
  id: string;                                   // "convois"
  label: string;                                // "Gestion des convois"
  ownerRoles: AppRole[];                        // rôles propriétaires (R-ROLE-09)
  requires: Permission;                         // "convoys:read"
  nav: NavItem[];                               // Dashboard, Tickets, Convois, Archive, Villes et pays
  Dashboard?: React.ComponentType<{ viewer: Viewer }>; // section d'accueil (maquette Main)
  search?: SearchProvider[];                    // § 12
  notifications?: NotificationProvider[];       // § 12
  sidebarCards?: React.ComponentType<{ viewer: Viewer }>[]; // ex. carte « villes à compléter »
}
// src/tools/index.ts
export const TOOLS: ToolManifest[] = [convoisTool];
```

La coque filtre `TOOLS` avec `can(viewer, tool.requires)`. Si aucun outil n'est accessible, l'accueil affiche le message « aucun outil » (R-TOOL-03). Le libellé de section de la barre latérale (« Chargé d'événementiel » dans la maquette) est le libellé du rôle de l'utilisateur.

### 3.2 Conventions de code (exigence, au même titre que la sécurité)

**Objectif** : un humain qui découvre le projet comprend chaque fichier en le lisant. Les règles ci-dessous s'appliquent à **toutes** les tâches. Celles qui peuvent l'être sont **vérifiées automatiquement** par ESLint en CI.

**Découpage**
- **Pages (`src/app/`) fines** : elles chargent les données (via `queries/`) et assemblent des composants. Aucune logique métier, aucune requête écrite directement dans une page.
- **Un composant = une responsabilité = un fichier** `PascalCase.tsx`. Dès qu'un composant mélange plusieurs choses (afficher, gérer un état, charger des données), on le découpe. Repère : au-delà d'environ 150 lignes, découper.
- **Composants de présentation** (props → affichage, sans état métier) séparés des **composants conteneurs** (état, appel d'actions).
- **État et logique d'interface** → hooks dédiés `use-xxx.ts` exportant `useXxx`.
- **Logique métier pure** → dossier `domain/` : fonctions sans React ni base de données, testées en unitaire.
- **Accès aux données isolé** : lectures dans `queries/`, écritures dans `actions/`. Un composant n'importe **jamais** le client de la base.
- **Une Server Action par fichier**, toujours construite avec `defineAction` (§ 16).
- Les primitives `components/ui/` (shadcn) ne contiennent aucune logique métier.

**Nommage**
- Fichiers `kebab-case.ts`, composants `PascalCase.tsx`, hooks `use-kebab-case.ts`.
- Identifiants du code en anglais ; textes de l'interface en français.
- Noms explicites, sans abréviation obscure. Les termes métier connus restent tels quels : TMP, RDV, DLC.
- Booléens en `is…` / `has…` / `can…`. Props typées par une interface `XxxProps`.

**Style**
- Fonctions courtes (repère : 40 lignes), un seul niveau d'abstraction par fonction.
- Exports nommés (export par défaut seulement là où Next.js l'exige : pages, layouts).
- Pas de `any`, pas de duplication (à la 2e occurrence, on extrait).
- Commentaires uniquement pour le **pourquoi** non évident, jamais pour paraphraser le code.
- Mêmes conventions d'un fichier à l'autre : un nouveau fichier ressemble à ses voisins.

**Garde-fous automatiques** (ESLint, `--max-warnings 0` en CI)

| Règle | Seuil | But |
|---|---|---|
| `max-lines` | 300 par fichier (hors tests et types générés) | Éviter les fichiers fourre-tout |
| `max-lines-per-function` | 60 (hors tests) | Fonctions et composants courts |
| `complexity` / `max-depth` | 10 / 3 | Logique lisible |
| `max-params` | 3 (au-delà : un objet) | Appels lisibles |
| `import/no-cycle` | — | Dépendances saines entre dossiers |
| `no-restricted-imports` | client de la base (`kysely`, `pg`, `@/core/db/client`) interdit hors `core/db`, `queries/`, `actions/` | Accès aux données isolé |
| `react/no-danger`, `@typescript-eslint/no-explicit-any` | erreur | Sécurité et typage |

**Relecture** : avant de rendre une tâche, l'auteur relit son code comme un nouveau venu le lirait et refactorise ce qui n'est pas clair. Le compte rendu de la tâche le confirme (tasks.md, « Mode d'emploi »).

---

## 4. Modèle de données (PostgreSQL)

**[PROPOSITION] Ticket et convoi forment une seule fiche (table `tickets`).** Un « convoi » est un ticket au statut `accepted`. Ce choix :
- évite toute divergence entre les infos de base du ticket et celles du convoi (R-TKT-20) ;
- donne un seul historique, affiché sur les deux vues (la maquette `Convoi` montre déjà les étapes du ticket dans l'historique du convoi) ;
- rend l'archivage simultané automatique.

Les champs du convoi sont remplis dès l'ajout (données API), mais **ne sont modifiables qu'au statut `accepted`**. Avant, seuls les pays (pop-up) et « Actualiser » peuvent les changer.

Le schéma ci-dessous est écrit dans `db/migrations/`. Les droits d'accès (RLS, colonnes modifiables, fonctions) sont décrits au § 6. Les types TypeScript sont générés à partir de la base (`database.types.ts`), jamais écrits à la main.

```sql
-- Extensions
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pg_cron;      -- installée dans l'image db/

-- Types
create type app_role      as enum ('event_manager','communication','manager','hr','direction','superadmin');
create type ticket_status as enum ('new','in_review','accepted','refused');
create type data_source   as enum ('initial','learned');   -- villes et pays : import du jeu | appris dans l'application

-- Utilisateurs autorisés (R-ROLE-*, R-ACC-*)
create table app_users (
  id               uuid primary key default gen_random_uuid(),
  discord_id       text not null unique check (discord_id ~ '^[0-9]{17,20}$'),
  role             app_role not null,
  is_accountant    boolean not null default false,
  is_active        boolean not null default true,
  discord_username text,                 -- synchronisé à la connexion (R-ACC-06)
  display_name     text,                 -- idem (« Nathan »)
  last_login_at    timestamptz,
  created_at       timestamptz not null default now(),
  created_by       uuid references app_users(id),   -- null = création initiale (bootstrap)
  updated_at       timestamptz not null default now(),
  updated_by       uuid references app_users(id)
);

-- Pays (import des fichiers du jeu, ou appris via « Autre pays… », R-CITY-12)
create table countries (
  id          smallint generated always as identity primary key,
  game_token  text unique,               -- ex. 'france', 'czech' ; null si appris
  name_fr     text not null,             -- ex. 'République tchèque'
  name_key    text not null unique,      -- normalisé comme les villes (§ 8.3) : pas de doublon
  source      data_source not null,      -- initial | learned
  created_at  timestamptz not null default now(),
  created_by  uuid references app_users(id)          -- null = import
);

-- Villes (R-CITY-*)
create table cities (
  id             integer generated always as identity primary key,
  name           text not null,          -- tel qu'affiché (« Prague »)
  name_key       text not null,          -- normalisé : minuscules, sans accents, espaces réduits (§ 8.3)
  country_id     smallint not null references countries(id),
  source         data_source not null,   -- initial | learned
  game_token     text,                   -- jeton du jeu (ex. 'reims'), null si apprise
  last_chosen_at timestamptz,            -- homonymes : dernier choix mémorisé (R-CITY-06)
  created_at     timestamptz not null default now(),
  created_by     uuid references app_users(id),     -- null = import
  updated_at     timestamptz not null default now(),
  updated_by     uuid references app_users(id),
  unique (name_key, country_id)
);
create index cities_name_key_idx on cities (name_key);
-- Q-15 : table city_aliases(alias_key, city_id) si les noms TruckersMP ≠ noms du jeu.

-- Paramètres (modèle global des consignes, R-SET-02)
create table settings (
  key        text primary key,           -- préfixé par l'outil : 'convoys.instructions_template', 'convoys.field_defaults'
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references app_users(id)
);

-- Tickets = convois (R-TKT-*, R-CNV-*)
create table tickets (
  id                    uuid primary key default gen_random_uuid(),
  -- Origine TruckersMP
  tmp_event_id          integer not null,
  tmp_snapshot          jsonb,               -- dernière réponse API (sans listes de participants) ; null = créé à la main (R-TKT-05)
  tmp_fetched_at        timestamptz,
  -- Parcours (toutes transitions permises, R-TKT-10)
  status                ticket_status not null default 'new',
  handler_id            uuid references app_users(id),   -- « Traité par » : dernière personne qui a pris en charge, accepté ou refusé (R-TKT-14)
  handled_at            timestamptz,
  refusal_reason        text,                            -- motif du dernier refus (l'historique les garde tous)
  accepted_by           uuid references app_users(id),   -- dernière acceptation (« Accepté par … le … »)
  accepted_at           timestamptz,
  convoy_initialized_at timestamptz,                     -- 1re acceptation : consignes, valeurs par défaut, copie de l'image (R-CNV-05/06/08)
  created_by            uuid not null references app_users(id),
  created_at            timestamptz not null default now(),
  archived_at           timestamptz,
  archived_by           uuid references app_users(id),   -- null + archived_at = « Système »
  -- Champs du convoi / message (specs § 7.2)
  display_name          text not null,
  company_name          text not null default '',
  departure_at          timestamptz not null,           -- UTC ; affiché Europe/Paris
  meetup_at             timestamptz not null,
  server_name           text not null default '',
  dlcs                  text not null default '',
  cibi                  text not null default '',
  departure_city        text not null default '',
  departure_country_id  smallint references countries(id),   -- null = à compléter
  departure_location    text not null default '',
  pause                 text not null default '',
  arrival_city          text not null default '',
  arrival_country_id    smallint references countries(id),
  arrival_location      text not null default '',
  gps                   text not null default '',
  distance              text not null default '',
  cargo                 text not null default '',
  tmp_url               text not null,
  tb_url                text not null default '',
  instructions          text not null default '',     -- copie du modèle à l'acceptation (R-CNV-05)
  route_image_tmp_url   text,                         -- image `map` de l'API
  route_image_path      text,                         -- fichier envoyé ou copié (volume route_images)
  updated_at            timestamptz not null default now(),
  updated_by            uuid references app_users(id),

  constraint refusal_needs_reason  check (status <> 'refused' or length(btrim(coalesce(refusal_reason,''))) > 0),
  constraint handled_needs_handler check (status = 'new' or handler_id is not null)
);
-- R-TKT-04 / Q-05 : un seul ticket non archivé par événement
create unique index tickets_active_event_uniq on tickets (tmp_event_id) where archived_at is null;
create index tickets_status_idx    on tickets (status) where archived_at is null;
create index tickets_departure_idx on tickets (departure_at);
create index tickets_search_idx    on tickets using gin (
  (rtdash.f_unaccent(lower(display_name || ' ' || company_name || ' ' || departure_city || ' ' || arrival_city))) gin_trgm_ops);

-- Vue de lecture : archivage « effectif » (R-ARC-07)
create view tickets_v as
  select t.*,
         (t.archived_at is not null or t.departure_at + interval '6 hours' <= now()) as is_archived
  from tickets t;

-- Historique (R-AUD-*) — en ajout seul
create table activity_log (
  id           bigint generated always as identity primary key,
  entity_type  text not null check (entity_type in ('ticket','city','country','user','setting')),
  entity_id    text not null,
  action       text not null,         -- created | taken | accepted | refused | status_changed | updated | refreshed | archived | country_set | learned | deactivated | reactivated
  actor_id     uuid references app_users(id),   -- null = Système
  occurred_at  timestamptz not null default now(),
  changes      jsonb not null default '[]',      -- [{ "field": "departure_at", "old": "…", "new": "…" }]
  details      jsonb not null default '{}'       -- ex. { "reason": "date déjà prise" }
);
create index activity_entity_idx on activity_log (entity_type, entity_id, occurred_at desc);
create index activity_recent_idx on activity_log (occurred_at desc);
```

`rtdash.f_unaccent` (schéma interne) est une fonction `immutable` qui enveloppe `unaccent`, ce qui la rend indexable. Les colonnes `created_by` et `actor_id` à `null` sont affichées « Système ». La vue `tickets_v` est créée avec `security_invoker = true`, pour que la RLS de `tickets` s'y applique.

---

## 5. Authentification Discord et vérification des rôles

### 5.1 Configuration (une seule fois)
1. **Discord Developer Portal**, application « RT-Dash » → OAuth2 → **Redirects** :
   - `APP_URL/auth/callback` en production (ex. `https://rt-dash.example.org/auth/callback`) ;
   - `http://localhost:3000/auth/callback` en local (§ 13.5).
   Les anciennes redirections vers Supabase (`…supabase.co/auth/v1/callback`, `127.0.0.1:54321`) peuvent être retirées.
2. Le **Client ID** et le **Client Secret** sont des variables d'environnement de l'application (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`) : `.env` du VPS (droits 600) et `.env.development.local` en local, jamais commités (§ 13.3).
3. Scope demandé : **`identify` seul**. Sans Supabase, aucun e-mail n'est demandé ni reçu (L-03 est sans objet).

### 5.2 Flux **[PROPOSITION]**
```
/login ── lien ──▶ /auth/login : crée state + code_verifier (PKCE), les garde 10 min dans un cookie
                   httpOnly, puis redirige vers discord.com/oauth2/authorize (scope identify)
Discord ──▶ /auth/callback?code&state : vérifie state, échange le code (avec le secret, côté serveur),
            lit GET /users/@me (id, username, global_name), oublie les jetons Discord,
            ouvre une session en base (open_session) et pose le cookie de session ──▶ /
/auth/logout (POST) : ferme la session en base (close_session) et efface le cookie ──▶ /login
```
- **Jetons Discord** : utilisés une seule fois pour lire le profil, puis jetés ; jamais stockés.
- **Session** : jeton aléatoire de 32 octets, dans le cookie `__Host-rtdash_session` (`httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`). La base ne garde que son **empreinte SHA-256**, jamais le jeton.
- **Durée** : 30 jours, sans prolongation ; une session peut être fermée avant (déconnexion). **[PROPOSITION]**
- Table interne `rtdash.sessions` (`id`, `token_hash` unique, `discord_id`, `discord_username`, `discord_display_name`, `created_at`, `expires_at`, `revoked_at`) : ni lisible ni modifiable par l'application en direct, seulement par les fonctions `open_session`, `close_session` et `rtdash.use_session` (`security definer`). Une session n'est jamais supprimée, seulement fermée ; les sessions expirées depuis plus de 90 jours sont purgées par `pg_cron` (donnée technique, pas une donnée métier). **[PROPOSITION]**
- Une session existe aussi pour une personne **non enregistrée** : elle sert à afficher son pseudo sur `/acces-refuse` (R-ACC-03), sans donner accès à rien.

### 5.3 Contrôle côté serveur (R-ACC-02..05)
- **`proxy.ts`** (Next 16) : sans cookie de session, redirige vers `/login` (pages publiques : `/login`, `/auth/login`, `/auth/callback`, `/api/health`). Il ne valide **pas** la session et ne vérifie **pas** les rôles : on ne se fie jamais au proxy seul.
- **Client de la base** (`core/db/client.ts`) : un pool de connexions avec le rôle `rtdash_app`. Toute requête faite pour un utilisateur passe par `withSession(token, (db) => …)`, qui ouvre une transaction et appelle d'abord `rtdash.use_session(token)` : la base vérifie elle-même le jeton (empreinte, non expirée, non fermée) et en déduit l'utilisateur pour la durée de la transaction (§ 6.1).
- **`getViewer()`** (mis en cache par requête avec `React.cache`) :
  1. lit le cookie de session ;
  2. appelle la fonction SQL `current_viewer()` dans `withSession` : compte RT-Dash **actif** dont l'ID Discord est celui de la session ;
  3. calcule les droits du rôle avec `permissionsOf()` (§ 5.4) ;
  4. renvoie `Viewer { id, role, isAccountant, displayName, permissions }`, ou `null` (pas de session valide, compte absent ou désactivé).
- **L'ID Discord vient uniquement de Discord** : lu par le serveur sur `GET /users/@me` avec le jeton obtenu lors de l'échange du code, puis gardé dans la session en base. Aucune donnée envoyée par le navigateur ne peut le changer (L-01).
- `(app)/layout.tsx` : `viewer === null` → `redirect('/acces-refuse')`.
- **Chaque Server Action** est construite avec `defineAction({ permission, input, run })` (§ 16.1, couche 4). **Chaque Route Handler** appelle `requirePermission(perm)`. Comme le rôle est relu à chaque requête, un changement de rôle s'applique immédiatement (R-ACC-05).
- `/acces-refuse` affiche le pseudo Discord de la session et un seul bouton, « Se déconnecter ».

### 5.4 Droits (R-ROLE-09)
Les droits sont **rangés par outil** et calculés à partir du registre (§ 3.1). Ajouter un outil ajoute ses droits sans toucher au reste.

```ts
// Droits d'un outil : '<outil>:read' | '<outil>:write' | '<outil>:settings'
// Outil convois : 'convoys:read', 'convoys:write' (tickets, convois, villes), 'convoys:settings' (consignes, valeurs par défaut)
type CorePermission = 'users:manage' | 'users:manage-superadmin' | 'users:deactivate-direction';

function permissionsOf(user: { role: AppRole; isAccountant: boolean }): Set<Permission> {
  // 1. superadmin : tout.
  // 2. direction : tous les droits de tous les outils + 'users:manage' (pas les deux droits dangereux, R-ROLE-05).
  // 3. autres rôles : read/write/settings des outils dont ils sont propriétaires (ownerRoles), rien d'autre.
  // 4. is_accountant : union avec les droits des outils « comptable » (aucun en v1).
}
```

**La même matrice existe côté base**, dans la fonction SQL `rtdash.has_permission(permission text)`, utilisée par toutes les règles RLS. Les deux versions sont écrites à la main, et un **test de concordance** (intégration) compare TypeScript et SQL pour chaque rôle × chaque droit. Une divergence fait échouer la CI.

Règles d'administration des comptes (R-ROLE-05/07/08, Q-08) : écrites en SQL dans la fonction `admin_save_user(...)`, qui fait foi. Elles sont reproduites en TypeScript dans `canApplyUserChange(actor, target, change)`, pour afficher ou masquer les boutons. Les deux sont testées sur **la même table de cas** (toutes combinaisons rôle de l'acteur × rôle de la cible × type de changement).

### 5.5 Premier superadmin (R-ACC-07)
Fonction SQL `rtdash.bootstrap_superadmin(discord_id text)`, exécutable **uniquement** par le propriétaire de la base (`rtdash_owner`) et sans effet si un superadmin actif existe déjà. Elle est appelée :
- en production, par le workflow de déploiement (SSH, `psql` dans le conteneur de la base) avec `BOOTSTRAP_SUPERADMIN_DISCORD_ID` (secret GitHub) ;
- en local, par `db/seed.sql`.

L'application (rôle `rtdash_app`) ne peut pas l'exécuter.

---

## 6. Accès aux données, RLS et traçabilité

### 6.1 Modèle d'accès
| Rôle Postgres | Qui | Droits |
|---|---|---|
| `postgres` (superutilisateur) | création du conteneur seulement (`db/init/`) | crée la base `rtdash` et les deux rôles ci-dessous ; jamais utilisé par l'application ni par les migrations |
| `rtdash_owner` | migrations (dbmate), premier superadmin, sauvegardes | propriétaire du schéma ; **jamais** utilisé par l'application |
| `rtdash_app` | l'application Next.js | `NOBYPASSRLS`, aucun droit sur le schéma ; lecture selon la RLS ; écriture **uniquement** sur les colonnes explicitement accordées, sous RLS ; jamais `DELETE` ni `TRUNCATE` ; exécution des seules fonctions accordées |

- **Identité dans la base** : en début de chaque transaction faite pour un utilisateur, l'application appelle `rtdash.use_session(jeton)` (`security definer`). La fonction calcule l'empreinte du jeton, vérifie que la session existe, n'est ni expirée ni fermée, et la retient pour la transaction (`set_config(…, true)`). `rtdash.current_app_user_id()` en déduit le compte RT-Dash **actif** dont l'ID Discord est celui de la session. Sans session valide : `null`.
- **Pourquoi le jeton et pas un identifiant** : l'application ne transmet jamais « je suis l'utilisateur X ». Pour agir au nom de quelqu'un, il faudrait connaître son jeton de session, qui n'est stocké nulle part en clair (la base ne garde que l'empreinte, et `rtdash_app` ne peut pas lire `rtdash.sessions`). Choisir un identifiant ne suffit donc pas pour agir au nom de quelqu'un.
- **Limites assumées** : (1) la base fait confiance à l'application pour lui transmettre le jeton reçu dans le cookie ; (2) `open_session`, appelée après la vérification auprès de Discord, est **le seul point** où la base accepte une identité Discord fournie par l'application : c'est le point de confiance du système, couvert par les tests du flux de connexion et par la revue de sécurité (T-11.3). C'est acceptable parce que la base n'est joignable que depuis le réseau Docker interne et seulement par l'application, avec des requêtes toujours paramétrées.
- Être connecté à Discord ne suffit pas : toutes les règles RLS passent par `rtdash.has_permission()`, qui renvoie `false` sans compte RT-Dash **actif** (R-ACC-02).
- **Fonctions SQL appelées par l'application** : schéma `public`, `security invoker` par défaut (la RLS s'applique). `security definer` seulement quand c'est indispensable (sessions, écrire l'historique, création du premier superadmin), toujours avec `set search_path = ''` et une vérification explicite du droit en première ligne.
- **Fonctions internes** : schéma `rtdash` (`use_session`, `has_permission`, `current_app_user_id`, triggers). `rtdash_app` n'exécute que celles qui lui sont explicitement accordées.
- Postgres donne par défaut le droit d'exécuter toute nouvelle fonction à tout le monde (`PUBLIC`). Ce droit est **retiré par défaut** (`alter default privileges for role rtdash_owner … revoke …`), puis accordé fonction par fonction à `rtdash_app`.

### 6.2 Règles RLS et droits par table

| Table | Lecture (`select`) | Ajout (`insert`) | Modification (`update`) |
|---|---|---|---|
| `app_users` | sa propre ligne, ou `users:manage` | — (fonction `admin_save_user`) | — (fonctions `admin_save_user`, `sync_my_profile`) |
| `tickets` | `convoys:read` | `convoys:write`, colonnes autorisées seulement | `convoys:write`, ticket non archivé, colonnes « champs du convoi » seulement |
| `countries`, `cities` | `convoys:read` | — (fonction `complete_cities`, page Villes) | `convoys:write` (colonnes autorisées) |
| `settings` | `<outil>:read` (selon le préfixe de la clé) | — | `<outil>:settings` |
| `activity_log` | selon le type d'élément (`ticket`, `city`, `country`, `setting` → `convoys:read` ; `user` → `users:manage`) | — (triggers uniquement) | jamais |
| Fichiers `route-images` (volume) | `convoys:read`, vérifié par la route qui sert le fichier en lisant le ticket sous RLS | `convoys:write` (Server Action) | `convoys:write` |

**Colonnes protégées** : les colonnes de parcours et de traçabilité ne sont **jamais** accordées en écriture à `rtdash_app` : `status`, `handler_id`, `handled_at`, `accepted_by`, `accepted_at`, `convoy_initialized_at`, `refusal_reason`, `archived_*`, `created_*`, `updated_*`. Elles ne changent qu'à travers les fonctions SQL ou les triggers. Personne ne peut donc, même avec une requête SQL directe sous le rôle de l'application, se faire passer pour un autre ou changer un statut sans passer par les règles.

### 6.3 Fonctions SQL de la v1
| Fonction | Rôle | Type |
|---|---|---|
| `open_session(...)` · `close_session()` | ouverture d'une session après la connexion Discord ; fermeture (déconnexion) | definer |
| `current_viewer()` | compte RT-Dash actif de la session (ID Discord de la session) ; pseudo Discord de la session | definer |
| `sync_my_profile(display_name, username)` | met à jour nom affiché, pseudo et dernière connexion **de son propre compte** | definer |
| `admin_save_user(...)` | ajout ou modification d'un compte, avec les règles R-ROLE-05..08 et Q-08 | definer |
| `take_ticket(id)` · `accept_ticket(id)` · `refuse_ticket(id, reason)` · `change_ticket_status(id, status)` | transitions de statut (R-TKT-10..15). `accept_ticket` initialise le convoi à la 1re acceptation : consignes et valeurs par défaut dans les champs vides | invoker |
| `archive_refused_ticket(id)` | archivage manuel d'un refusé (R-ARC-04) | invoker |
| `complete_cities(ticket_id, choices)` | pop-up des villes, en une transaction (§ 8.3) | invoker |
| `search_tickets(q)` · `search_cities(q)` | recherche approximative (§ 12.1) | invoker |
| `rtdash.archive_due_tickets()` | archivage automatique (pg_cron, § 11) | interne |
| `rtdash.bootstrap_superadmin(discord_id)` | premier superadmin (§ 5.5) | interne, `rtdash_owner` seulement |

Les écritures simples d'une seule ligne (ajout d'un ticket, enregistrement du convoi, Actualiser, chemin de l'image, paramètres) sont faites directement par Kysely (`db.insertInto(...)`, `db.updateTable(...)`) dans la Server Action, sous RLS et dans les colonnes autorisées.

### 6.4 Triggers
| Trigger | Tables | Rôle |
|---|---|---|
| `forbid_delete` (BEFORE DELETE) | toutes les tables métier | `raise exception 'Suppression interdite'` (R-AUD-01), même pour `rtdash_owner` |
| `activity_log_append_only` (BEFORE UPDATE/DELETE) | `activity_log` | l'historique ne se modifie jamais |
| `set_actor_columns` (BEFORE INSERT/UPDATE) | tables métier | remplit `created_by` / `updated_by` avec `rtdash.current_app_user_id()` (déduit de la session) ; toute valeur envoyée par le client est ignorée |
| `ticket_guard` (BEFORE UPDATE) | `tickets` | refuse toute modification d'un ticket archivé (`archived_at` non null, **ou** départ + 6 h passé, sauf l'archivage lui-même) (R-ARC-05/07). Le motif de refus est imposé par la contrainte `refusal_needs_reason`. |
| `audit_row` (AFTER INSERT/UPDATE, `security definer`) | `tickets`, `cities`, `countries`, `app_users`, `settings` | écrit une ligne `activity_log` avec les champs modifiés (ancien → nouveau), en ignorant `updated_at`, `updated_by`, `tmp_snapshot` et `tmp_fetched_at` |

### 6.5 Qui a fait quoi
- **Acteur** : `rtdash.current_app_user_id()`, déduit de la session vérifiée en base (§ 6.1). Absent (job d'archivage, SQL manuel) → `null`, affiché « Système ».
- **Action** : une fonction SQL la fixe avec `set_config('rtdash.action', 'accepted', true)` (valable pour sa transaction). Sinon, `audit_row` la déduit : ajout → `created` ; `tmp_fetched_at` modifié → `refreshed` ; seuls les pays modifiés → `country_set` ; sinon `updated`.
- **Détails** (ex. motif de refus) : passés de la même façon (`rtdash.details`).
- Une modification produit **une** ligne d'historique : l'action plus tous les champs modifiés. Rien ne peut échapper au journal, même une modification faite à la main en SQL.

### 6.6 Verrous pour les tables et fonctions futures
- **Droits par défaut** : toute nouvelle table, séquence ou fonction créée par `rtdash_owner` est fermée à `rtdash_app` et à `PUBLIC`. Il faut accorder chaque droit explicitement dans la migration.
- **Test structurel pgTAP** (CI) : échoue si une table de `public` n'a pas la RLS activée, si `PUBLIC` a le moindre droit, si `rtdash_app` a `DELETE` ou `TRUNCATE`, possède un objet, contourne la RLS ou peut lire `rtdash.sessions`, si une colonne protégée (§ 6.2) est modifiable par `rtdash_app`, ou si une fonction `security definer` n'a pas de `search_path` fixé.
- **Test « sans session »** (intégration) : avec le rôle `rtdash_app` et sans session (ou avec une session expirée, fermée ou inventée), aucune ligne métier n'est lisible et aucune écriture ne passe.

### 6.7 Affichage de l'historique
`activity_log` → libellés français : table de correspondance champ → libellé (`departure_at` → « l'heure de départ ») et action → phrase (« a accepté le ticket · convoi créé »). Les dates sont reformatées en Europe/Paris. Exemple : « **Lina** a modifié l'heure de départ : 21:00 → 21:30 · 13 oct. 2026 · 09:18 ».

---

## 7. Intégration de l'API TruckersMP

- **Point d'accès** : `GET {TRUCKERSMP_API_URL}/events/{id}` (par défaut `https://api.truckersmp.com/v2`). Réponse : `{ "error": false, "response": { … } }`. Champs réels : [specs § 7.1](specs.md) et [`truckersmp-event-36491.json`](design/truckersmp-event-36491.json).
- **Côté serveur uniquement**, avec un `User-Agent: RT-Dash (+{APP_URL})`, un délai maximal de 10 s (`AbortSignal.timeout`) et 1 nouvel essai sur erreur réseau ou 5xx. Pas de nouvel essai sur 404.
- **Lien** : `parse-url.ts` → `^https?://(www\.)?truckersmp\.com/events/(\d+)(-[\w-]*)?/?$` → `id` (R-TKT-02).
- **Validation** : schéma Zod des seuls champs utilisés, avec tolérance aux champs inconnus. `error: true`, 404 ou réponse invalide donnent un message clair (US-11). Le format exact de la réponse d'erreur est à relever pendant T-5.3, la documentation n'étant pas lisible automatiquement.
- **Dates** : `start_at` et `meetup_at` (`"2026-11-07 20:30:00"`) sont interprétées comme **UTC**. Vérifié : `start_at` 20:30 UTC correspond au départ réel 21H30 (heure d'hiver, UTC+1).
- **Correspondance** : `mapping.ts`, fonction pure `mapEventToTicketFields(event)`, qui applique le tableau de [specs § 7.2](specs.md) :
  - `company_name = event.vtc.id !== 0 ? event.vtc.name ?? '' : ''`
  - `dlcs = Object.values(event.dlcs ?? {}).join(', ') || 'Aucun'` (l'API renvoie `[]` quand c'est vide et `{id: nom}` sinon)
  - `tmp_url = 'https://truckersmp.com/events/' + event.id`
  - `route_image_tmp_url = event.map`
- **Instantané** : `tmp_snapshot` garde la réponse **sans** `attendances.confirmed_users`, `unsure_users` ni `confirmed_vtcs`, ce qui évite de stocker des pseudos de tiers et du volume inutile.
- **Actualiser** (R-TKT-30..32) : nouvelle récupération → `mapping` → `diff.ts` compare les seuls champs issus de l'API avec les valeurs actuelles → l'interface montre les différences à cocher → la Server Action applique la sélection et met à jour `tmp_snapshot` et `tmp_fetched_at` (le trigger d'audit en déduit l'action `refreshed`).
- **Image** (Q-18) : à la **première** acceptation (`convoy_initialized_at` null), l'image `map` est copiée sur le volume des images de trajet (`route_image_path`), pour ne pas dépendre de TruckersMP par la suite. Le lien TruckersMP reste affiché partout en texte cliquable (R-TKT-06).
- **API indisponible** (R-TKT-05) : sur erreur réseau, délai dépassé ou 5xx (après le nouvel essai), `addTicket` renvoie `{ kind: 'api_unavailable' }`. L'interface affiche alors le formulaire manuel (lien + nom, entreprise, date, RDV, départ ; villes et lieux facultatifs). Le ticket est créé avec `tmp_snapshot = null` et une pastille « Données TruckersMP manquantes ». « Actualiser » le complète plus tard, avec le même écran de différences. Sur 404 ou lien invalide : pas de formulaire manuel.
- **Limites de débit** : non documentées publiquement (documentation inaccessible). Le volume est très faible (un appel par ajout ou actualisation), donc aucun cache n'est prévu.

---

## 8. Villes et pays

### 8.1 Import initial (R-CITY-01..03)
1. **Extraction** (sur ton PC, hors dépôt) : décompresser les archives du jeu (`base.scs`, archives des DLC cartes) avec l'**extracteur officiel de SCS** (SCS Extractor, publié sur le wiki de modding de SCS). Les archives ProMods ne sont **pas** traitées (specs R-CITY-02b, Q-17).
2. **Analyse** : `pnpm cities:parse --dir <extraction>` lit :
   - `def/city/*.sui` → blocs `city_data: city.<jeton> { city_name: "…", country: <jeton_pays> … }` ;
   - les définitions de pays et la traduction française (`locale/fr_fr/…`) → nom français du pays (« République tchèque »).
   - *La structure exacte de ces fichiers est à confirmer pendant l'extraction (T-7.1). Le script échoue bruyamment sur toute entrée qu'il ne comprend pas, sans jamais compléter de mémoire.*
3. **Résultat versionné** : `db/seed/countries.json`, `cities.json`, plus `cities.report.md`.
4. **Chargement** : `pnpm db:seed:cities` fait un upsert idempotent (`source = 'initial'`).

### 8.2 Vérification de la liste
- Le rapport donne le nombre de villes par pays, la liste des **homonymes** (que tu relis) et les entrées rejetées.
- Contrôles automatiques : aucune ville sans pays, aucun jeton de pays inconnu, aucun doublon (nom, pays).
- **Échantillon** : 20 villes tirées au hasard, à vérifier à la main sur la carte du jeu. Le résultat est noté dans le rapport.
- **Couverture TruckersMP (Q-15)** : on résout les villes de départ et d'arrivée des événements renvoyés par `GET /v2/events` (environ 20 événements). Le taux de reconnaissance et les noms non reconnus sont listés. Cela révèle les écarts de nommage entre TruckersMP et le jeu, à traiter par des alias.
- ProMods (Q-17, décidé le 2026-10-15) : pas d'extraction. Les villes ProMods sont apprises au fil de l'eau via le pop-up, sans distinction avec le jeu de base. La couverture TruckersMP ci-dessus montre combien de villes des événements réels restent à apprendre.

### 8.3 Normalisation et résolution
```ts
normalizeCityKey(s) = s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim()

resolveCity(name) →
  0 ligne   → { status: 'unknown' }                          → pop-up, choix libre parmi les pays
  1 ligne   → { status: 'resolved', countryId }              → rempli automatiquement
  n lignes  → { status: 'ambiguous', candidates, suggested }  → pop-up, suggested = last_chosen_at le plus récent
```
- **Ajout d'un ticket** : `resolved` remplit `*_country_id` ; sinon le champ reste `null` et la ville apparaît dans le pop-up, les notifications et la carte de la barre latérale.
- **Enregistrement du pop-up** : fonction SQL `complete_cities` (une seule transaction) :
  - pays saisi via « Autre pays… » (R-CITY-12) → recherche par `name_key` ; s'il n'existe pas, insertion dans `countries` (`source = 'learned'`, `game_token = null`) avec historique `learned` sur le pays ;
  - ville **inconnue** → insertion dans `cities` (`source = 'learned'`), puis propagation aux tickets **non archivés** qui ont la même `name_key` et un pays `null` (R-CITY-09) ;
  - **homonyme** → `last_chosen_at = now()` sur la ville choisie, appliqué **à ce ticket seulement** (la confirmation est redemandée pour chaque ticket, R-CITY-06) ;
  - historique : `country_set` sur le ticket, `learned` sur la ville.
- **Aperçu en direct** : le formulaire du convoi charge l'index `name_key → candidats`, environ quelques centaines de lignes. La résolution de l'aperçu est donc instantanée côté client. Le serveur résout à nouveau à l'enregistrement.

---

## 9. Message Discord : génération et aperçu

### 9.1 Générateur unique (R-MSG-01)
`src/tools/convois/discord/build-message.ts`, fonction **pure et isomorphe** (navigateur et serveur, sans I/O) :

```ts
export interface ConvoyMessageInput {
  companyName: string;
  departureAt: Date;           // instant UTC
  meetupAt: Date;
  serverName: string; dlcs: string; cibi: string;
  departure: { city: string; country: string | null; location: string };
  pause: string;
  arrival:   { city: string; country: string | null; location: string };
  gps: string; distance: string; cargo: string;
  tmpUrl: string; tbUrl: string;
  instructions: string;        // multiligne
}
export function buildConvoyMessage(input: ConvoyMessageInput): string;
```
- Gabarit écrit **en dur**, ligne par ligne, d'après [specs § 8.2](specs.md). Les lignes sont jointes par `\n`, sans `\n` final.
- `date` = `Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' })` → « samedi 7 novembre ».
- Heures : format `HH:mm` en Europe/Paris, puis `:` remplacé par `H` → « 21H30 ».
- Pays `null` → `pays à compléter` (R-MSG-11).
- Le schéma Zod du formulaire **refuse** `` ` `` dans les champs affichés en code (R-CNV-09). Le générateur suppose donc des valeurs propres ; un test vérifie qu'il lève une erreur si on lui en passe une malgré tout.
- Consignes : chaque ligne préfixée par `> `, `**` au début de la première ligne et à la fin de la dernière. **[PROPOSITION]** si les consignes sont vides, le bloc de citation et ses lignes vides sont omis.
- **Test « golden »** : `buildConvoyMessage(exemple)` doit être **identique, octet par octet**, à [`message-convoi-exemple.md`](design/discord/message-convoi-exemple.md).
- **v2** : le bot appellera cette même fonction côté serveur et joindra l'image (`route_image_path`).

### 9.2 Aperçu (R-MSG-02..05)
- `DiscordMessagePreview({ markdown, imageUrl })` est un composant client. `markdown = useMemo(() => buildConvoyMessage(formValues))`, avec `formValues` venant de `watch()` de React Hook Form. Il se met donc à jour à chaque frappe.
- **Analyse Markdown « façon Discord »** : Discord **n'est pas** du CommonMark. Par exemple, `** Date :**` (espace dans le gras) est rendu en gras par Discord mais pas par un parseur standard. **[PROPOSITION]** utiliser un parseur fondé sur les règles `simple-markdown`, comme le client Discord (candidat : `discord-markdown-parser`). Un **spike** (T-8.2) le valide sur l'exemple réel. En cas d'échec, on écrit un petit parseur dédié au sous-ensemble utilisé : titres `#`/`##`, citation `>`, gras, italique, code en ligne, URL brute.
- Rendu en éléments React, **sans `dangerouslySetInnerHTML`**. Les liens s'ouvrent avec `rel="noopener noreferrer"`.
- Emojis rendus en images Twemoji.
- Police : la police de Discord (« gg sans ») n'est pas redistribuable. On utilise la pile de la maquette : `'gg sans','Noto Sans','Helvetica Neue',Helvetica,Arial,sans-serif`, avec Noto Sans chargée.
- Styles Discord (thème sombre par défaut, issus de la maquette `Convoi`), dans des variables `--discord-*` propres à l'aperçu, **séparées** de la palette RT-Dash :

| Élément | Valeur |
|---|---|
| Fond du message | `#313338`, rayon 14 px, marge intérieure 16/18 px |
| Texte | `#DBDEE1`, 16 px / 22 px |
| Titres et gras | `#F2F3F5` ; `#` 24/33 px 700 ; `##` 20/27 px 700 ; espace avant `##` 44 px |
| Code en ligne | fond `#2B2D31`, bordure `#1E1F22`, rayon 4, marge `0 4px`, 14 px, police Consolas… |
| Barre de citation | 4 px `#4E5058`, rayon 4 |
| Lien | `#00A8FC` |
| En-tête | avatar 40 px, nom « RavenBot » 16 px 500 `#F2F3F5`, badge « APP » `#5865F2` 10 px, horodatage 12 px `#949BA4` (`JJ/MM/AAAA HH:mm`) |
| Image | carte `#2B2D31`, bordure `#1E1F22`, rayon 8, largeur max 520 px |
| Réactions d'exemple | fond `#2B2D31`, bordure `#3F4147`, rayon 8, texte `#B5BAC1` |

- Pastille « En direct » (jaune) et note sous l'aperçu, comme la maquette. L'avatar de RavenBot est provisoirement le texte « RAVENBot » (Q-20).

---

## 10. Tokens de design et maquette

**Source unique : `src/app/globals.css`.** Changer une couleur de la palette = modifier **une** variable. Les valeurs viennent de la maquette (`docs/design/maquette/*.dc.html`). Le thème est sombre uniquement (`color-scheme: dark`).

```css
@import "tailwindcss";

:root {
  /* — Palette officielle RT-Dash — */
  --rt-yellow: #F8C032;
  --rt-black:  #1F1F1F;
  --rt-violet: #847EC2;

  /* — Teintes dérivées (maquette) — */
  --rt-page:           #171717;
  --rt-surface:        var(--rt-black);
  --rt-surface-hover:  #262626;
  --rt-border:         #2E2E2E;
  --rt-border-strong:  #3A3A3A;
  --rt-border-dashed:  #4A4A4A;
  --rt-text:           #F4F4F4;
  --rt-text-muted:     #A3A3AB;
  --rt-text-nav:       #A8A8B0;
  --rt-text-label:     #C4C4CA;
  --rt-lilac-light:    #E4E1F7;   /* 3e carte du dashboard */
  --rt-lilac-text:     #B9B4E8;
  --rt-on-accent:      var(--rt-black);   /* texte foncé sur jaune et violet */
  --rt-chart-grid:     #333333;
  --rt-overlay:        rgb(0 0 0 / 0.62);

  /* — Statuts (vert et rouge : seules couleurs hors palette) — */
  --rt-status-new-fg:      var(--rt-lilac-text);  --rt-status-new-bg:      rgb(132 126 194 / 0.22);
  --rt-status-review-fg:   var(--rt-yellow);      --rt-status-review-bg:   rgb(248 192 50 / 0.16);
  --rt-status-accepted-fg: #7ED6A0;               --rt-status-accepted-bg: rgb(126 214 160 / 0.16);
  --rt-status-refused-fg:  #F28B82;               --rt-status-refused-bg:  rgb(242 139 130 / 0.16);

  /* — Rayons — */
  --rt-radius-card: 22px;  --rt-radius-kpi: 20px;  --rt-radius-tile: 18px;
  --rt-radius-dialog: 26px; --rt-radius-field: 12px; --rt-radius-field-lg: 14px;
  --rt-radius-nav: 12px;   --rt-radius-pill: 9999px;

  /* — Variables shadcn/ui, reliées à la palette — */
  --background: var(--rt-page);          --foreground: var(--rt-text);
  --card: var(--rt-surface);             --card-foreground: var(--rt-text);
  --popover: var(--rt-surface);          --popover-foreground: var(--rt-text);
  --primary: var(--rt-yellow);           --primary-foreground: var(--rt-on-accent);
  --secondary: var(--rt-violet);         --secondary-foreground: var(--rt-on-accent);
  --muted: var(--rt-surface-hover);      --muted-foreground: var(--rt-text-muted);
  --accent: rgb(248 192 50 / 0.12);      --accent-foreground: var(--rt-yellow);
  --destructive: var(--rt-status-refused-fg);
  --border: var(--rt-border);            --input: var(--rt-border-strong);
  --ring: var(--rt-yellow);              --radius: var(--rt-radius-field);
  --chart-1: var(--rt-violet);           --chart-2: var(--rt-yellow);
  --sidebar: var(--rt-surface);          --sidebar-foreground: var(--rt-text-nav);
  --sidebar-primary: var(--rt-yellow);   --sidebar-border: var(--rt-border);
  color-scheme: dark;
}

@theme inline {
  --color-background: var(--background);  --color-foreground: var(--foreground);
  --color-card: var(--card);              --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);    --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);            --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);          --color-input: var(--input);  --color-ring: var(--ring);
  --color-rt-yellow: var(--rt-yellow);    --color-rt-violet: var(--rt-violet);
  --color-rt-lilac-light: var(--rt-lilac-light); --color-rt-lilac-text: var(--rt-lilac-text);
  /* … une entrée par token --rt-* … */
  --radius-card: var(--rt-radius-card);   --radius-pill: var(--rt-radius-pill);
  --font-sans: var(--font-jakarta), system-ui, sans-serif;
}
```

### 10.1 Typographie
**Plus Jakarta Sans** (graisses 400, 500, 600, 700, 800) via `next/font/google`, exposée dans `--font-jakarta`. Échelle de la maquette :

| Usage | Taille / graisse |
|---|---|
| Titre de page (« Bonjour, Nathan », « Tickets ») | 22 / 800 |
| Titre de pop-up | 20 / 800 |
| Nom « RT-Dash » de la barre latérale | 18 / 800, letter-spacing −0.01em |
| Titre de section ou de carte | 15 / 800 ; titre de carte KPI 14 / 800 |
| Chiffre KPI | 32 / 800, line-height 1.1 |
| Texte courant, tableau, navigation | 13–14 / 600 (navigation), 13 (tableau) |
| Libellé de champ | 12 / 600, couleur `--rt-text-label` |
| Texte secondaire, en-têtes de tableau, pastilles | 12, couleur `--rt-text-muted` ; pastilles 12 / 700 |

### 10.2 Composants (inventaire de la maquette)

| Composant | Spécification (maquette) | Écrans |
|---|---|---|
| `Sidebar` | 240 px, fond `surface`, bordure droite `border`, marge 24/16, espacement 24 ; logo `rt-dash-mark-white` 34 px + « RT-Dash » ; libellé du rôle (12 / 600, `muted`) ; liens 10/12 px, rayon 12, 14 / 600 ; **actif** : texte jaune + fond `rgb(248 192 50 / .12)` ; en bas : Paramètres, Déconnexion | tous |
| `SidebarAlertCard` | fond violet, texte foncé, rayon 18, marge 16 ; bouton « Compléter » sombre à texte jaune, en pilule | tous |
| `PageHeader` | titre 22 / 800 + sous-titre 12 `muted` ; boutons ronds 44 px, bordure `border-strong` (recherche ; cloche en jaune) ; avatar 44 px violet avec initiale + nom et rôle | tous |
| `KpiCard` | variantes `yellow` / `violet` / `lilac` ; rayon 20, marge 20, hauteur min. 132 ; bouton flèche rond 40 px fond `black`, icône de la couleur de la carte | Main |
| `Panel` | fond `surface`, bordure `border`, rayon 22, marge 20, titre 15 / 800 ; variante `accent-top` (bordure haute 4 px jaune, violet ou lilas) | Main, Tickets, Convoi |
| `StatusPill` | 12 / 700, marge 3/10, pilule ; couleurs `--rt-status-*` ; suffixe facultatif (« En analyse · Max », « Accepté · convoi créé ») | partout |
| `PillButton` | `primary` (jaune), `secondary` (violet), `outline` (bordure `border-strong`), `inverse` (fond noir, texte jaune, sur fond jaune) ; survol `brightness(1.08)` | partout |
| `StatusTabs` | pilules 8/16, 13 px ; actif = fond jaune 800 ; inactif = bordure `border-strong` et texte de la couleur du statut ; « Tous · 15 » | Tickets |
| `AddTicketForm` | section jaune rayon 22 ; champ 46 px, rayon 14, bordure 2 px noire, fond blanc ; bouton `inverse` « Récupérer les infos » ; note d'aide | Tickets |
| `TicketsTable` | largeur min. 880, défilement horizontal ; en-têtes 12 / 600 `muted` ; cellules 14/12 ; survol de ligne `surface-hover` ; motif de refus sous le nom ; pastille violette « N villes à compléter » | Tickets |
| `TicketCard` | rayon 18, marge 16 ; nom 14 / 700, pastille, entreprise, ligne « 14 nov. · RDV 20:00 · Départ 20:30 » + bouton | Main |
| `Field` | 44 px, rayon 12, bordure `border-strong`, fond `page`, marge 0/14, 14 px ; zone de texte : hauteur min. 110, redimensionnable | Convoi |
| `CountryField` | connu : boîte 44 px, texte jaune ; inconnu : bouton violet « Pays à compléter · Compléter » | Convoi |
| `ImageDrop` | 150 px, rayon 14, bordure pointillée `border-dashed`, fond rayé | Convoi |
| `HistoryList` | avatar 32 px, **nom** + phrase, date 12 `muted` | Main, Convoi |
| `CitiesDialog` | largeur max. 640, rayon 26, bordure `border-strong`, bordure haute 4 px violette, ombre `0 30px 80px rgb(0 0 0 / .6)`, fond assombri `--rt-overlay` ; lignes rayon 16 bordure violette ; boutons « Plus tard » / « Enregistrer et mémoriser » | Ville |
| `AccessDeniedCard` | largeur max. 460, rayon 26, bordure haute 4 px jaune ; logo complet blanc 260 px ; cercle violet 64 px ; « Vous n'avez pas accès » 22 / 800 | Acces |
| `ActivityChart` | grille en pointillés `chart-grid`, axes 12 `muted`, courbes violette (Reçus) et jaune (Acceptés), infobulle en pilule | Main |
| `Avatar` (initiale) | couleur choisie de façon déterministe parmi jaune, lilas clair et violet **[PROPOSITION]** | partout |
| Focus | `outline: 2px solid var(--rt-yellow); outline-offset: 2px` sur les éléments focusables | partout |

### 10.3 Logos
- Copiés depuis `docs/design/logos/` vers `public/brand/`.
- Barre latérale : `rt-dash-mark-white.png` (34 px).
- Page Accès refusé et page de connexion : `rt-dash-logo-white.png` (260 px).
- Favicon : `rt-dash-mark-white.png`, plus `rt-dash-mark-black.png` en thème clair via `media="(prefers-color-scheme: light)"` (Q-23).

### 10.4 Écrans hors maquette (décidé, ex-Q-11)
Connexion, détail du ticket, liste des convois, Archive, Villes et pays, Paramètres, recherche, liste des notifications, comparaison « Actualiser ». Ils sont construits **uniquement** avec les composants ci-dessus et l'image de référence. Une capture est soumise à ta validation à la fin de chaque phase concernée.

---

## 11. Archivage automatique (R-ARC-*)

```sql
create function rtdash.archive_due_tickets() returns integer language plpgsql as $$
declare n integer;
begin
  perform set_config('rtdash.action', 'archived', true);   -- acteur absent = « Système »
  update tickets set archived_at = now(), archived_by = null
   where archived_at is null and departure_at + interval '6 hours' <= now();
  get diagnostics n = row_count; return n;
end $$;

select cron.schedule('rtdash-archive', '*/5 * * * *', $$select rtdash.archive_due_tickets()$$);
```
- `interval '6 hours'` sur un `timestamptz` ajoute 6 heures **réelles** (R-ARC-02).
- La lecture seule est effective dès l'échéance, grâce à `tickets_v.is_archived` et au trigger `ticket_guard` (R-ARC-07), même avant le passage du job.
- Archivage manuel d'un refusé (R-ARC-04) : fonction SQL `archive_refused_ticket(id)`, appelée par une Server Action ; action `archived`, acteur = l'utilisateur.
- La fonction `rtdash.archive_due_tickets()` est interne (schéma `rtdash`) : elle n'est pas appelable par l'API.
- `pg_cron` est installé dans l'image de la base (`db/Dockerfile`) et chargé au démarrage (`shared_preload_libraries`). Les tâches tournent dans la base `rtdash`.

---

## 12. Recherche, notifications, dashboard

### 12.1 Recherche façon Spotlight (R-SRC-*)
```ts
interface SearchProvider {
  id: string; group: string;                 // « Tickets et convois », « Villes », « Pages et actions »
  requires: Permission | null;
  search(q: string, viewer: Viewer): Promise<SearchResult[]>;
}
interface SearchResult { id: string; title: string; subtitle?: string; href: string; badge?: 'Archivé' | string; }
```
- Server Action `globalSearch(q)` (min. 2 caractères, attente de 150 ms après la frappe côté client) : interroge en parallèle (`Promise.allSettled`) les fournisseurs autorisés, avec un plafond de 5 résultats par groupe.
- Correspondance approximative : fonctions SQL `search_tickets(q)` et `search_cities(q)` (`security invoker` : la RLS s'applique, donc chacun ne trouve que ce qu'il a le droit de voir), avec `pg_trgm` (similarité + `ILIKE`) sur des chaînes passées par `f_unaccent(lower(…))`. L'index GIN est défini au § 4.
- Fournisseurs v1 : `convois.tickets` (archive comprise, pastille « Archivé »), `convois.cities`, `core.navigation` (pages et actions autorisées, Q-22).
- Interface : composant `Command` de shadcn dans une boîte de dialogue, raccourci global Ctrl+K / ⌘+K, navigation au clavier.

### 12.2 Notifications (R-NOT-*)
```ts
interface NotificationProvider { id: string; requires: Permission; count(viewer): Promise<number>; items(viewer): Promise<NotificationItem[]>; }
```
v1 : `convois.cities-pending` = villes distinctes (`name_key`) dont `*_country_id` est `null` sur des tickets non archivés, avec les tickets concernés. Rien n'est stocké : le décompte est calculé, donc toujours juste. La même source alimente la cloche et la carte de la barre latérale.

### 12.3 Dashboard événementiel
`tools/convois/dashboard` reproduit la maquette `Main` : cartes KPI, `ActivityChart` (série par jour sur 28 jours glissants, Q-21 ; « Reçus » = `created` par jour, « Acceptés » = `accepted` par jour, depuis `activity_log`), historique récent (3 dernières lignes de `activity_log` pour les tickets), prochain convoi, colonne « Tickets à traiter ».

---

## 13. Docker, configuration, portabilité

### 13.1 Images
- **Application** : `Dockerfile` en plusieurs étapes : `deps` (`pnpm install --frozen-lockfile`) → `build` (`next build`, standalone) → `runner` (`node:24-alpine` ou `-slim`, **utilisateur non root**, copie de `.next/standalone`, `.next/static` et `public`, `HEALTHCHECK` sur `/api/health`, `CMD ["node","server.js"]`). Il n'y a **aucune** variable au moment du build : la même image tourne partout. Retirer npm, corepack et yarn de l'image finale (L-06).
- **Base** : `db/Dockerfile`, image officielle `postgres:17` (Debian, épinglée par empreinte, L-05) + paquets `postgresql-17-cron` et `postgresql-17-pgtap` (dépôt PGDG de l'image). `pg_cron` chargé par `shared_preload_libraries`, tâches dans la base `rtdash`. Scripts `db/init/` : au **premier** démarrage seulement, création de la base `rtdash` et des rôles `rtdash_owner` et `rtdash_app` avec leurs mots de passe lus dans l'environnement. Publiée sur GHCR comme l'application (`rt-dash-db`).

### 13.2 `docker-compose.yml` (production) **[PROPOSITION]**
```yaml
services:
  db:
    image: ghcr.io/${GITHUB_OWNER}/rt-dash-db:${TAG:-latest}
    environment: [POSTGRES_PASSWORD, RTDASH_OWNER_PASSWORD, RTDASH_APP_PASSWORD]
    volumes: ["db_data:/var/lib/postgresql/data"]
    restart: unless-stopped
    security_opt: ["no-new-privileges:true"]
    healthcheck: { test: ["CMD", "pg_isready", "-d", "rtdash"], interval: 10s }
    # aucun port publié : joignable seulement par le réseau Docker interne
  migrate:                       # lancé par le déploiement : docker compose run --rm migrate
    image: ghcr.io/amacneil/dbmate@sha256:…
    profiles: ["tools"]
    environment: [DATABASE_URL=postgres://rtdash_owner:…@db:5432/rtdash]
    volumes: ["./db/migrations:/db/migrations:ro"]
    depends_on: { db: { condition: service_healthy } }
  app:
    image: ghcr.io/${GITHUB_OWNER}/rt-dash:${TAG:-latest}
    env_file: .env
    restart: unless-stopped
    read_only: true
    tmpfs: ["/tmp", "/app/.next/cache"]
    volumes: ["route_images:/data/route-images"]
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    depends_on: { db: { condition: service_healthy } }
  caddy:
    image: caddy:2-alpine@sha256:…
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile:ro", "caddy_data:/data", "caddy_config:/config"]
    depends_on: { app: { condition: service_healthy } }
volumes: { db_data: {}, route_images: {}, caddy_data: {}, caddy_config: {} }
```
`Caddyfile` : `{$DOMAIN} { reverse_proxy app:3000 }`. Le certificat HTTPS est obtenu automatiquement.

### 13.3 Variables d'environnement

**Sur le VPS** (`.env`, droits 600, propriété de `deploy`) :

| Variable | Rôle |
|---|---|
| `APP_URL` | URL publique (ex. `https://rt-dash.example.org`) |
| `DOMAIN` | Domaine pour Caddy |
| `DATABASE_URL` | Connexion de l'application : rôle `rtdash_app`, hôte `db` (réseau interne) |
| `POSTGRES_PASSWORD`, `RTDASH_OWNER_PASSWORD`, `RTDASH_APP_PASSWORD` | Mots de passe des rôles Postgres (générés, longs, différents) |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Application Discord (connexion, § 5.1) |
| `TRUCKERSMP_API_URL` | `https://api.truckersmp.com/v2` |
| `APP_TIMEZONE` | `Europe/Paris` |
| `GITHUB_OWNER`, `TAG` | Images à déployer |

**Dans les secrets GitHub uniquement** (environnement `production`) :

| Secret | Rôle |
|---|---|
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` | Déploiement, migrations et sauvegardes, tous par SSH |
| `BOOTSTRAP_SUPERADMIN_DISCORD_ID` | Premier superadmin (§ 5.5) : `640173855096307712` |
| `BACKUP_AGE_PUBLIC_KEY` | Chiffrement des sauvegardes (la clé privée reste chez l'utilisateur) |

**En local** (`.env.development.local`, jamais commité) : `APP_URL=http://localhost:3000`, `DATABASE_URL` vers le Postgres local, `DISCORD_CLIENT_ID` et `DISCORD_CLIENT_SECRET`.

### 13.4 Changer de VPS
Les données (base et images de trajet) sont maintenant **sur le VPS**. Changer de serveur :
1. Préparer le nouveau serveur (`scripts/vps/setup.sh`, § 13.7) ; copier `docker-compose.yml`, `Caddyfile` et `.env`.
2. Arrêter l'application sur l'ancien serveur, lancer une dernière sauvegarde (§ 13.6).
3. Restaurer cette sauvegarde sur le nouveau serveur (procédure du runbook, testée en T-11.8).
4. Mettre à jour les secrets GitHub `VPS_*`, faire pointer le DNS vers la nouvelle IP, relancer le workflow « deploy ».

Si le **domaine** change : mettre à jour `APP_URL`, `DOMAIN` et la redirection Discord (§ 5.1).

### 13.5 Développement local
Un seul conteneur : la base. `compose.dev.yml` lance l'image `db/` avec le port publié sur `127.0.0.1` uniquement.
- `pnpm db:up` : démarre la base locale ;
- `pnpm db:reset` : recrée la base locale, applique toutes les migrations, puis `db/seed.sql` (dont le premier superadmin local) ;
- `pnpm db:migrate` : applique les nouvelles migrations ;
- `pnpm db:types` : régénère `src/core/db/database.types.ts` (kysely-codegen) ;
- `pnpm db:test` : tests pgTAP (`pg_prove` dans le conteneur) ;
- `pnpm dev` : l'application, branchée sur la base locale.

### 13.6 Sauvegardes (données sur le VPS) **[PROPOSITION]**
Les données vivent sur le VPS : une sauvegarde quotidienne, chiffrée et **hors du VPS** est indispensable.
1. **`scripts/vps/backup.sh`** (sur le VPS) : `pg_dump` (rôle `rtdash_owner`, format personnalisé) + archive du volume `route_images`, le tout chiffré avec `age` et la **clé publique**, écrit directement sur la sortie standard. Rien n'est écrit en clair sur le disque.
2. **Workflow `backup.yml`** (GitHub Actions, tous les jours à 04:00 UTC, et à la main) : se connecte au VPS en SSH, lance le script, récupère le flux chiffré et le garde en *artefact* GitHub pendant **30 jours** (Q-T8). Seul du chiffré quitte le VPS. Actif quand la variable du dépôt `BACKUP_ENABLED` vaut `true` (après la mise en service, phase 11).
3. **Restauration testée** : `docs/runbook.md` décrit la restauration dans une base neuve ; elle est testée avant la mise en production (T-11.8).

### 13.7 VPS Debian 12 (Q-T6)
Système choisi : **Debian 12**, accès SSH **par clé**. Préparation, scriptée dans `scripts/vps/setup.sh` et décrite dans le runbook :
- utilisateur `deploy` non root, connexion SSH par clé uniquement (`PasswordAuthentication no`, `PermitRootLogin no`) ;
- pare-feu `ufw` : seuls 22, 80 et 443 sont ouverts ; `fail2ban` sur SSH ;
- mises à jour de sécurité automatiques (`unattended-upgrades`) ;
- Docker Engine et le plugin Compose depuis le dépôt officiel de Docker ;
- `.env` en droits `600`, propriété de `deploy`.

> À savoir : d'après le calendrier Debian (à confirmer au moment de l'installation), Debian 13 est la version stable actuelle et Debian 12 est en support long (LTS) jusqu'en 2028. Debian 12 convient. Si tu installes un VPS **neuf**, Debian 13 serait le choix le plus durable ; la procédure est la même.

---

## 14. CI/CD

**En quelques lignes.** Le CI/CD est un robot, **GitHub Actions**, qui travaille à chaque fois que tu envoies du code sur GitHub :
1. **CI (intégration continue)** : il installe le projet et lance les vérifications (style, types, tests, build). Si quelque chose échoue, tu le vois sur GitHub et **rien n'est déployé**.
2. **CD (déploiement continu)** : quand la branche `main` est verte, il fabrique les images Docker (application et base), les range dans le registre de GitHub (GHCR), puis se connecte au VPS en SSH : il applique les migrations de la base (dbmate) et lance `docker compose pull && docker compose up -d`.

Concrètement, tu pousses ton code et, quelques minutes plus tard, le site est à jour. Revenir en arrière consiste à redéployer l'image d'un commit précédent.

| Workflow | Déclencheur | Étapes |
|---|---|---|
| `ci.yml` | chaque push, toutes branches (une pull request affiche les résultats du push de sa branche, sans double exécution) | `pnpm install` → lint → `tsc` → **contrôles de sécurité** (gitleaks, `pnpm audit`, absence de `NEXT_PUBLIC_`) → tests unitaires (dont la **matrice des droits**) → tests de la base (image `db/` construite et lancée, migrations rejouées depuis zéro, **pgTAP** et tests d'intégration Vitest ; L-07) → **types à jour** (les types générés doivent être identiques à ceux du dépôt) → `next build` → **tests e2e** (en-têtes de sécurité, sur le build de production) → build de l'image + scan Trivy |
| `deploy.yml` | push sur `main` (après la CI) ; aussi lançable à la main avec un `TAG` | build des images, push `ghcr.io/<owner>/rt-dash:<sha>` et `rt-dash-db:<sha>` (+ `:latest`) → SSH sur le VPS : copie des migrations, `TAG=<sha> docker compose pull`, `docker compose run --rm migrate up`, `rtdash.bootstrap_superadmin(...)` (sans effet s'il existe déjà), `docker compose up -d` → contrôle de `/api/health` |
| `backup.yml` | tous les jours (cron) ; aussi lançable à la main | SSH sur le VPS → `scripts/vps/backup.sh` (base + images, chiffrées sur le VPS) → artefact 30 jours (§ 13.6) ; actif avec `BACKUP_ENABLED` |

- Secrets GitHub (environnement `production`) : voir § 13.3. `VPS_KNOWN_HOSTS` contient l'empreinte SSH du VPS, vérifiée à chaque connexion. GHCR utilise le `GITHUB_TOKEN`. Variables (non secrètes) du dépôt : `APP_URL` (contrôle de `/api/health` après déploiement) `DEPLOY_ENABLED` (`true` à partir de la phase 11 : active les étapes SSH de `deploy.yml`) et `BACKUP_ENABLED` (`true` une fois le VPS en service : active `backup.yml`). La clé **privée** de déchiffrement des sauvegardes reste chez toi, hors de GitHub.
- Migrations **compatibles avec la version précédente** (on ajoute d'abord, on retire plus tard), puisqu'elles passent avant le déploiement de la nouvelle image.
- Protection de `main` : **reportée par l'utilisateur le 2026-11-08** (travail en solo, pas de pull request ; T-1.2). Sur le nouveau dépôt, aucune règle n'est active. Si elle est posée un jour : vérifications de la CI obligatoires, commits signés, ni réécriture de l'historique ni suppression de `main`.

---

## 15. Stratégie de tests

| Niveau | Outil | Contenu |
|---|---|---|
| Unitaires | Vitest | **golden** `buildConvoyMessage` vs `message-convoi-exemple.md` (octet par octet) ; conversions Europe/Paris, dont les changements d'heure (29/03/2026, 25/10/2026, heures inexistantes ou ambiguës) ; `parse-url` ; `mapping` avec `truckersmp-event-36491.json` (entreprise vide, DLCs « Aucun », départ 21H30, RDV 20H30) ; DLCs non vides ; matrice des droits (`permissionsOf`) et `canApplyUserChange` ; normalisation et résolution des villes (inconnue, unique, homonyme, mémorisation) ; `diff` d'Actualiser |
| Base de données | **pgTAP** (`pnpm db:test`) + Vitest, sur l'image `db/` (Postgres 17 + pg_cron), en CI comme sur le poste | **sessions** (valide, expirée, fermée, inventée) ; **règles RLS rôle par rôle** (chaque rôle, compte désactivé, non enregistré, sans session) ; test structurel (§ 6.6) ; **concordance** des droits TypeScript ↔ SQL et des règles d'administration (§ 5.4) ; colonnes protégées non modifiables ; suppression refusée ; `activity_log` en ajout seul ; ligne d'audit avec acteur et changements ; acteur absent = Système ; toutes les transitions de statut permises sauf sur un ticket archivé ; motif obligatoire à chaque refus ; données du convoi conservées après « désacceptation » ; ticket archivé non modifiable (y compris échéance passée sans job) ; `archive_due_tickets` ; unicité de l'événement actif ; propagation d'une ville apprise |
| Composants | Vitest + Testing Library | l'aperçu rend l'exemple (gras « Date : », 6 codes en ligne, citation, lien, pas de HTML brut) ; pays inconnu → « pays à compléter » |
| Visuel | Playwright (captures) | aperçu Discord comparé à la capture de référence (validation humaine) ; écrans vs maquette |
| Bout en bout | Playwright + base locale (image `db/`) | accès refusé ; parcours ajout → prise en charge → acceptation → modification → historique ; refus avec motif ; pop-up des villes ; archive en lecture seule |
| Contrat API | job manuel / hebdomadaire | appel réel `GET /v2/events/36491` et validation du schéma Zod, pour détecter un changement de l'API |

Connexion en bout en bout **[PROPOSITION]** : on ne peut pas automatiser un vrai login Discord. Les tests Playwright créent eux-mêmes une session **directement dans la base de test** (rôle `rtdash_owner`) et posent le cookie correspondant. L'application ne contient donc **aucune** route ni variable de connexion de test : rien à désactiver en production (remplace l'ancien `E2E_TEST_AUTH`).

---

## 16. Sécurité (exigence forte)

**Principe** : la sécurité ne doit pas dépendre de la vigilance de chacun. Chaque règle importante est **imposée par un mécanisme** et **vérifiée automatiquement** par les tests ou la CI. Les couches se recouvrent (défense en profondeur) : si l'une a un défaut, la suivante bloque encore.

### 16.1 Couches de protection

| # | Couche | Mesures | Vérification automatique |
|---|---|---|---|
| 1 | **Serveur (VPS)** | Debian, SSH par clé uniquement, root désactivé, pare-feu (22/80/443), `fail2ban`, mises à jour de sécurité automatiques. Seul Caddy est exposé ; l'application n'écoute que sur le réseau Docker interne. | Script de préparation idempotent ; scan des ports depuis l'extérieur au premier déploiement (T-11.4). |
| 2 | **Transport et en-têtes** | HTTPS automatique (Caddy), HSTS, CSP stricte avec nonce, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. | Test e2e qui vérifie la présence et la valeur de chaque en-tête. |
| 3 | **Authentification** | Discord OAuth2 (code + `state` + PKCE), aucun mot de passe local ; jetons Discord jamais stockés. Cookie de session `__Host-` `httpOnly`, `Secure`, `SameSite=Lax` ; la base ne garde que l'empreinte du jeton. La session est **vérifiée par la base** à chaque requête (`rtdash.use_session`), jamais lue sans vérification. | Tests du flux (state invalide, code refusé, profil Discord invalide) ; pgTAP des sessions ; tests de `getViewer()` : sans session, session expirée ou fermée, compte absent, compte désactivé → aucun accès. |
| 4 | **Autorisation** | **Deux barrières.** (1) Next.js : toute Server Action est construite avec `defineAction({ permission, input, run })`, qui fait dans l'ordre session → `getViewer()` → droit → validation Zod → exécution dans une transaction portant la session de l'utilisateur. (2) Postgres : la RLS revérifie le droit sur chaque ligne (§ 6). Pages : garde dans le layout + `requirePermission` par page. CSRF : contrôle d'origine des Server Actions, fait **par défaut** par Next.js (origine = domaine du site). `serverActions.allowedOrigins` n'est volontairement pas défini : il ne sert qu'à autoriser d'autres origines et serait figé au build (décidé le 2026-10-15). | (a) Un test parcourt **tous** les fichiers `actions/` et échoue si une action exportée n'utilise pas `defineAction`. (b) **Test de la matrice des droits** : chaque action × chaque rôle (+ comptable, + compte désactivé, + non enregistré) → autorisé ou refusé, comparé à specs § 2.2. Un oubli fait échouer la CI. |
| 5 | **Entrées** | Zod sur toute entrée (actions, routes, réponses TruckersMP) ; longueurs maximales sur tous les textes ; identifiants validés (UUID) ; `` ` `` refusé dans les champs en code (R-CNV-09). | Tests unitaires des schémas. |
| 6 | **Base de données** | RLS sur toutes les tables, par droit (`rtdash.has_permission`) ; l'application se connecte avec `rtdash_app` (sans contournement de la RLS, sans `DELETE` ni `TRUNCATE`, seulement sur les colonnes autorisées) et les migrations avec `rtdash_owner` ; identité déduite par la base du jeton de session (§ 6.1) ; base joignable seulement par le réseau Docker interne ; colonnes de parcours et de traçabilité modifiables uniquement par fonctions SQL et triggers ; exécution des fonctions retirée à `PUBLIC` ; fonctions `security definer` avec `search_path` fixé. Triggers : pas de suppression, archives figées, historique automatique avec l'auteur déduit de la session. | Tests pgTAP rôle par rôle ; test structurel (§ 6.6) ; test « sans session » ; test de concordance TypeScript ↔ SQL (§ 5.4). |
| 7 | **Fichiers envoyés** | Type vérifié sur les premiers octets (PNG, JPEG, WebP), 8 Mo maximum, **image ré-encodée côté serveur** (supprime métadonnées et contenus cachés), nom généré par le serveur, fichier sur un volume privé, servi uniquement par une route qui relit le ticket sous RLS (`convoys:read`), avec `Cache-Control: private, no-store`. | Tests avec un faux PNG (script renommé), un fichier trop gros, une image avec métadonnées. |
| 8 | **Affichage** | React échappe tout. Aucun `dangerouslySetInnerHTML`. L'aperçu Markdown produit des éléments React. Liens externes limités à `http(s)` avec `rel="noopener noreferrer"`. | Règle ESLint `react/no-danger` en erreur ; test de l'aperçu avec une valeur contenant du HTML. |
| 9 | **Secrets** | Aucune variable `NEXT_PUBLIC_*`. Secrets du VPS (mots de passe Postgres, secret Discord) dans `.env` (droits 600), jamais dans l'image ni dans le dépôt. L'application ne connaît que le mot de passe de `rtdash_app`. La clé privée des sauvegardes reste hors de GitHub et du VPS. | La CI échoue si `NEXT_PUBLIC_` apparaît dans `src/` ; **gitleaks** en CI détecte un secret commité. |
| 10 | **Dépendances et image** | Fichier de verrouillage figé, **Dependabot** (alertes + mises à jour), `pnpm audit --audit-level=high` bloquant (exceptions nominatives seulement, justifiées et datées dans `pnpm-workspace.yaml`, ex. `braces` sans correctif publié au 2026-10-15), image Docker scannée par **Trivy** (npm, corepack et yarn retirés de l'image finale). Actions GitHub et images des scanners **épinglées par empreinte** (SHA / digest), jamais par étiquette ; Dependabot avec un délai de 3 jours avant de proposer une nouvelle version. | Étapes bloquantes de `ci.yml`. |
| 11 | **Conteneur** | Utilisateur non root, système de fichiers en lecture seule (tmpfs pour `/tmp` et le cache Next), aucune capacité Linux (`cap_drop: [ALL]`), `no-new-privileges`. | Vérifié par un test sur la configuration `docker compose`. |
| 12 | **Abus** | Limite de débit par utilisateur sur l'ajout de ticket, « Actualiser » et la connexion (ex. 20 par minute) **[PROPOSITION]**. | Test unitaire du limiteur. |
| 13 | **Traces** | Refus d'accès et erreurs journalisés côté serveur, sans jetons ni secrets. Historique métier complet dans `activity_log`. | — |
| 14 | **Sauvegardes** | Quotidiennes, chiffrées, restauration testée (§ 13.6). | Restauration testée en T-11.8. |

### 16.2 Contrôles avant la mise en production (T-11.3)
- Revue de sécurité outillée (commande `/security-review` de Claude Code + passage de la liste ci-dessus, ligne par ligne).
- Tests d'attaque simples, notés dans un rapport :
  - appel direct de chaque Server Action avec chaque rôle et sans session ;
  - requêtes SQL directes avec le rôle `rtdash_app` et **une vraie session** de chaque rôle (contournement de Next.js) : lecture, écriture de colonnes protégées, appel des fonctions ;
  - requêtes SQL avec `rtdash_app` sans session, avec une session expirée, fermée ou inventée ;
  - port Postgres injoignable depuis l'extérieur ;
  - envoi d'un fichier piégé ;
  - en-têtes HTTP ;
  - scan des ports du VPS.
- Aucune mise en production tant qu'un point bloquant reste ouvert.

---

## 17. Décisions techniques

Les questions fonctionnelles sont dans [specs § 13–14](specs.md).

| # | Sujet | Décision |
|---|---|---|
| Q-T1 | Accès aux données | **Révisée le 2026-11-08 (D-06)** : Kysely côté serveur, chaque transaction portant la session de l'utilisateur ; RLS par droit, fonctions SQL, migrations dbmate. Remplace Supabase « classique » (2026-11-02), qui remplaçait Drizzle (2026-10-14). |
| Q-T2 | Règles dans la base | Oui : RLS, droits par colonne, triggers et contraintes en plus du code (non-suppression, archives figées, motif de refus, audit). |
| Q-T3 | Hébergement de la base | **Révisée le 2026-11-08 (D-06)** : Postgres dans Docker sur le VPS, sauvegardes quotidiennes chiffrées hors du VPS (§ 13.6). Remplace le plan Supabase gratuit. |
| Q-T4 | Emojis de l'aperçu | Twemoji (attribution CC-BY dans « À propos »). |
| Q-T5 | Connexion de test e2e | **Révisée le 2026-11-08** : sessions de test créées directement dans la base de test par Playwright ; aucune route de test dans l'application (§ 15). |
| Q-T6 | VPS | **Debian 12**, accès SSH par clé (§ 13.7). |
| Q-T7 | Préproduction | Non en v1 : local + production. |
| Q-T8 | Emplacement des sauvegardes | Artefacts GitHub chiffrés, 30 jours ; en télécharger une de temps en temps. |
| P2-a | Base des tests d'intégration (2026-10-15, révisée le 2026-11-08) | L'image `db/` (Postgres 17 + pg_cron + pgTAP) en CI comme sur le poste, avec les rôles `rtdash_owner` et `rtdash_app`. |
| P2-b | Images de trajet (2026-10-15, révisée le 2026-11-08) | Volume Docker `route_images` servi par une route qui vérifie le droit ; plus de bucket Supabase. |
| P2-c | Tables et fonctions futures | Droits par défaut fermés + test structurel pgTAP + test REST (§ 6.6). |
| Q-17 | ProMods (2026-10-15) | Pas d'extraction : `countries` a `source`, `name_key` et `game_token` facultatif pour les pays appris (R-CITY-12). |
| D-01 | Redémarrage (2026-11-02) | Le code de la première tentative (phases 1 et 2, sur Drizzle) est abandonné ; le développement reprend de zéro dans un nouveau dossier à partir de ces documents. Les comptes externes de la phase 0 sont conservés. |
| D-02 | Lisibilité du code (2026-11-02) | Exigence au même titre que la sécurité : conventions et garde-fous du § 3.2. |
| D-03 | Comptes rendus (2026-11-02) | Un compte rendu par tâche, regroupé dans `docs/comptes-rendus/phase-N.md`, plus un bilan de fin de phase (tasks.md, « Mode d'emploi »). |
| D-04 | Périmètre strict (2026-11-02) | Une tâche ne modifie que ce qu'elle doit modifier. Tout autre changement est signalé dans le compte rendu et attend l'accord de l'utilisateur. |
| D-05 | Développement local (2026-11-02, révisée le 2026-11-08) | Base locale = même image `db/` que la production (`compose.dev.yml`), connexion Discord réelle avec la redirection `http://localhost:3000/auth/callback`. |
| D-06 | Abandon de Supabase (2026-11-08) | Demande de l'utilisateur : une pile plus propre, sans les nombreux services Supabase inutiles. **Next.js full-stack + Postgres seul dans Docker** (pas d'API séparée : une API NestJS ne se justifierait que pour d'autres clients, ex. le bot v2, et pourra s'ajouter plus tard). Accès Kysely, migrations dbmate, connexion Discord et sessions gérées par l'application, images sur un volume, sauvegardes par SSH. Le code Supabase des tâches T-2.1 à T-2.5 (commits `3725605`, `6d0f81e`) est remplacé ; le projet Supabase cloud (T-0.2) n'est plus utilisé. |

---

## 18. Leçons de la première tentative (phases 1 et 2, octobre 2026)

À appliquer dès la reprise, pour ne pas refaire les mêmes erreurs :

| # | Leçon | Où elle s'applique |
|---|---|---|
| L-01 | Ne jamais lire l'identité dans une donnée que l'utilisateur peut modifier (en 2026-10 : `user_metadata` de Supabase). Depuis D-06 : l'ID Discord est lu par le serveur sur `GET /users/@me` avec le jeton obtenu à l'échange du code, puis gardé dans la session en base. | § 5.3 |
| L-02 | *(Sans objet depuis D-06.)* La connexion directe à Supabase cloud n'existait qu'en IPv6 ; les runners GitHub passaient par le pooler en IPv4. Leçon générale : vérifier l'accès réseau réel de la CI avant d'en dépendre. | § 13.3, § 14 |
| L-03 | *(Sans objet depuis D-06.)* Supabase ajoutait toujours le scope `email` ; avec Discord OAuth direct, seul `identify` est demandé. | § 5.1 |
| L-04 | Next.js vérifie déjà l'origine des Server Actions. Ne pas définir `serverActions.allowedOrigins` : il ne sert qu'à autoriser d'autres origines et serait figé au build. | § 16.1, couche 4 |
| L-05 | Actions GitHub et images des scanners épinglées par empreinte (SHA / digest) ; Dependabot attend 3 jours avant de proposer une nouvelle version. | § 14, § 16.1, couche 10 |
| L-06 | `pnpm audit` bloquant : les exceptions sont nominatives, justifiées et datées dans `pnpm-workspace.yaml`. Il faut aussi retirer npm, corepack et yarn de l'image finale pour que Trivy passe. | § 16.1, couche 10 |
| L-07 | Les tests d'intégration ont besoin d'une base complète, identique à la production (pas d'un Postgres nu) : `pg_cron`, pgTAP, rôles `rtdash_owner` et `rtdash_app`. D'où l'image `db/` commune au poste, à la CI et au VPS. | § 14, § 15 |
| L-08 | La CI se lance sur chaque push, toutes branches. Une pull request affiche les résultats du push de sa branche, sans double exécution. | § 14 |
