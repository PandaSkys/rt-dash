# RT-Dash — Plan de développement

> Statut : **RÉVISION 1.1 du 2026-11-08, validée le 2026-11-09** (révision 1.0 du 2026-11-02 ; version 0.4 validée le 2026-10-15).
> Changements de la 1.1 : abandon de Supabase (design D-06) ; phase 2 réécrite ; tâches des phases 3, 5, 6, 7 et 11 ajustées (sessions, rôle `rtdash_app`, volume des images, sauvegardes par SSH).
> Changements de la 1.0 : reprise du code de zéro (D-01), Supabase « classique » (Q-T1 révisée), méthode de travail (compte rendu par tâche, périmètre strict, lisibilité), phases 1 à 3 réécrites.
> Documents liés : [specs.md](specs.md) · [design.md](design.md) · [prompts-phases.md](prompts-phases.md) · [../CLAUDE.md](../CLAUDE.md)

## Mode d'emploi

### Déroulé d'une tâche
1. **Lire** la tâche, ses références (`R-…`, sections du design, écran de maquette) et la section « Leçons » du design (§ 18).
2. **Annoncer** en une ou deux phrases ce qui va être fait et quels fichiers seront créés ou modifiés.
3. **Tests d'abord** pour toute logique pure ou métier (Vitest, pgTAP) : on écrit le test qui échoue, puis le code.
4. **Coder** en respectant les conventions du design § 3.2 (petits composants, hooks, logique pure dans `domain/`, accès aux données dans `queries/` et `actions/`).
5. **Relire** son propre code comme un nouveau venu le lirait, et refactoriser ce qui n'est pas clair.
6. **Vérifier** la « définition de terminé » ci-dessous.
7. **Écrire le compte rendu** de la tâche, puis cocher la tâche dans ce fichier.

### Périmètre strict (D-04)
- Une tâche ne modifie **que** les fichiers nécessaires à cette tâche.
- **Interdit hors tâche** : refactoriser, renommer, reformater, mettre à jour une dépendance, « améliorer en passant » du code existant.
- Si un autre changement semble nécessaire : **ne pas le faire**. Le noter dans le compte rendu (« Points ouverts ») et demander l'accord de l'utilisateur.
- Le compte rendu liste **chaque** fichier touché avec sa raison. Un fichier modifié sans raison liée à la tâche doit être remis dans son état d'origine.

### Compte rendu (D-03)
- Un fichier par phase : `docs/comptes-rendus/phase-N.md`, créé au début de la phase à partir du modèle [`comptes-rendus/_modele.md`](comptes-rendus/_modele.md).
- **Une section par tâche**, ajoutée dès que la tâche est terminée : ce qui a été fait, fichiers créés et modifiés (avec la raison), comment vérifier, tests, écarts avec les documents, points ouverts, relecture.
- **Un bilan de fin de phase** en bas du fichier : résumé, démonstration, captures d'écran, ce qui reste.

### Définition de « terminé »
Une tâche n'est terminée que si :
- le critère *Fini quand* est atteint ;
- `pnpm lint` (zéro avertissement), `pnpm typecheck` et tous les tests passent ;
- le code respecte le design § 3.2 et a été relu ;
- aucun fichier hors périmètre n'a été modifié ;
- le compte rendu de la tâche est écrit ;
- la tâche est cochée ci-dessous.

### Repères
- Format des tâches : **T-phase.n** · description · *Fini quand* (critère d'acceptation) · *Réf.* (règles des specs, sections du design, écran de maquette).
- **À chaque tâche d'interface** : ouvrir l'écran correspondant dans [`design/maquette/`](design/maquette/) **et** [`design/reference-dashboard.png`](design/reference-dashboard.png). Reprendre couleurs, tailles et textes exacts **via les tokens**, jamais de couleur en dur. Pour l'aperçu Discord : [`design/discord/`](design/discord/).
- 🧑 = action à faire par l'utilisateur (compte, secret, données du jeu). ⛔ = dépend d'une question ouverte (Q-…), à trancher avant de commencer.
- **Fin de phase** : bilan dans le compte rendu, démonstration, captures, puis **arrêt** jusqu'à la validation de l'utilisateur.
- **Secrets** : ne jamais demander de coller une clé, un mot de passe ou une chaîne de connexion dans la discussion. Indiquer où l'utilisateur doit les mettre lui-même.
- **Git** : commits signés (1Password), jamais contournés. Ne commiter et ne pousser qu'avec l'accord de l'utilisateur.

---

## Phase 0 — Prérequis (comptes et accès)

Les ressources externes créées lors de la première tentative sont **conservées** pour la reprise (D-01).

- [x] **T-0.1** 🧑 Dépôt GitHub `PandaSkys/rt-dash` (privé), relié en SSH, commits signés par clé SSH (1Password), règle « Protection de main » active (2026-10-14/15). À la reprise, le choix entre ce dépôt (nouvelle branche ou historique réinitialisé) et un nouveau dépôt se fait en T-1.2.
- [x] ~~**T-0.2** 🧑 Projet **Supabase cloud**, plan gratuit, région **Irlande** (`eu-west-1`), le 2026-10-14. Vérifié : connexion directe en IPv6 seulement ; pooler `aws-0-eu-west-1.pooler.supabase.com` en IPv4, port 5432 joignable (L-02).~~ **Sans objet depuis le 2026-11-08 (D-06)** : le projet Supabase n'est plus utilisé ; à supprimer par l'utilisateur quand il le souhaite.
- [x] **T-0.3** 🧑 Application **Discord** « RT-Dash », redirection `https://zmdnkhssmvpekfqfbhgr.supabase.co/auth/v1/callback`, aucun bot (2026-10-15). Client ID et Secret dans 1Password. Depuis D-06, l'application parle directement à Discord : redirections `http://localhost:3000/auth/callback` (T-2.3) puis `APP_URL/auth/callback` (T-11.6) ; les redirections vers Supabase pourront être retirées.
- [ ] **T-0.4** 🧑 Choisir le domaine (⛔ Q-25) et avoir un VPS **Debian 12** accessible en SSH par clé (design § 13.7). Peut attendre la phase 11.
- [x] **T-0.5** ID Discord du premier superadmin : `640173855096307712` (2026-10-14).
- [x] ~~**T-0.6** Autorisation ProMods.~~ **Abandonnée le 2026-10-15** (Q-17) : pas d'extraction ProMods ; villes ProMods apprises via le pop-up ; pays manquant ajouté via « Autre pays… » (R-CITY-02b, R-CITY-12).

## Phase 1 — Socle, qualité, Docker et CI/CD

- [x] **T-1.1** Initialiser Next.js (App Router, TypeScript strict, `src/`, pnpm), Prettier, alias `@/`. ESLint avec **toutes les règles de lisibilité et de sécurité du design § 3.2**, `--max-warnings 0`. Créer `docs/comptes-rendus/phase-1.md` depuis le modèle. *Fini quand* `pnpm dev` affiche une page, et `pnpm lint` et `pnpm typecheck` passent. *Réf.* design § 2, § 3.2.
- [ ] **T-1.2** 🧑 + moi : choisir le dépôt (existant ou nouveau), `.gitignore` (`.env*` sauf `.env.example`), premier commit signé, push, protection de `main` (CI obligatoire, commits signés). *Réf.* design § 14.
- [x] **T-1.3** Vitest et Testing Library : configuration + un test d'exemple. Scripts `test`, `test:unit`, `test:integration`. *Fini quand* `pnpm test` passe.
- [x] **T-1.4** Playwright (configuration + test de fumée sur `/api/health`). *Fini quand* `pnpm test:e2e` passe en local.
- [x] **T-1.5** `/api/health` : 200 + `{status:"ok"}`. La vérification de la base s'ajoute en phase 2.
- [x] **T-1.6** `next.config` : `output: "standalone"` ; en-têtes de sécurité (CSP avec nonce, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) ; **pas** de `serverActions.allowedOrigins` (L-04). *Fini quand* un test e2e vérifie chaque en-tête. *Réf.* design § 13.1, § 16.1 (couches 2, 4, 8).
- [x] **T-1.7** `Dockerfile` en plusieurs étapes, utilisateur non root, `HEALTHCHECK`, aucune variable au build, npm, corepack et yarn retirés de l'image finale (L-06). *Fini quand* `docker build` puis `docker run` répondent sur `/api/health`.
- [x] **T-1.8** `docker-compose.yml` (app + Caddy ; app en lecture seule, `cap_drop: [ALL]`, `no-new-privileges`), `Caddyfile` (HSTS), `.env.example` complet et commenté (variables du VPS seulement, design § 13.3). *Fini quand* `docker compose up` en local sert l'app derrière Caddy (`DOMAIN=localhost`) et qu'un test vérifie la configuration du conteneur.
- [x] **T-1.9** `.github/workflows/ci.yml` (chaque push, toutes branches, L-08) : install (cache pnpm) → lint → typecheck → **contrôles de sécurité** (gitleaks, `pnpm audit --audit-level=high` avec exceptions datées, absence de `NEXT_PUBLIC_` et de `SERVICE_ROLE` dans `src/`) → tests unitaires → build → e2e → image + scan Trivy. Actions et images épinglées par empreinte (L-05). *Fini quand* la CI est verte et qu'un faux secret commité la fait échouer. *Réf.* design § 14, § 16.1 (couches 9, 10).
- [x] **T-1.10** `.github/workflows/deploy.yml` : build et push de l'image GHCR (`:sha`, `:latest`). Étapes migration, superadmin et SSH déjà écrites mais désactivées (`DEPLOY_ENABLED`) jusqu'à la phase 11. *Fini quand* l'image apparaît dans GHCR après une fusion sur `main`.
- [x] **T-1.11** `README.md` : lancer en local, variables, liens vers `docs/` et `CLAUDE.md`.
- [x] **T-1.12** Dependabot (`.github/dependabot.yml` : npm, Docker, GitHub Actions ; délai de 3 jours, L-05) et alertes de sécurité activées.

## Phase 2 — Base Postgres (Docker), sessions et connexion Discord

> **Révisée le 2026-11-08 (D-06).** La première version de cette phase (Supabase, commits `3725605` et `6d0f81e`) est remplacée. Ce qui reste valable est repris : migration de base et test structurel (adaptés aux rôles `rtdash_owner` / `rtdash_app`), page `/login`, proxy, CSP, routes `/auth/*` (réécrites sans Supabase).

- [x] **T-2.1** Retrait de Supabase (dépendances, `supabase/`, `src/core/supabase/`, scripts, CI) et socle de la base : `db/Dockerfile` (Postgres 17 épinglé + `pg_cron` + pgTAP), `db/init/` (base `rtdash`, rôles `rtdash_owner` et `rtdash_app`), `compose.dev.yml` (base seule, port sur `127.0.0.1`), dbmate, scripts `pnpm db:up`, `db:reset`, `db:migrate`, `db:test`, `db:types`. Client `core/db/client.ts` (Kysely + `pg`, rôle `rtdash_app`). Règle ESLint `no-restricted-imports` : `kysely`, `pg` et `@/core/db/client` interdits hors `core/db`, `queries/` et `actions/`. *Fini quand* `pnpm db:reset`, `pnpm db:test` et `pnpm db:types` fonctionnent en local et que plus rien ne référence Supabase dans le code. *Réf.* design § 2, § 3, § 13.1, § 13.5.
- [x] **T-2.2** Première migration : droits par défaut fermés (`rtdash_owner` → rien pour `rtdash_app` ni `PUBLIC`), extensions (`pg_trgm`, `unaccent`, `pg_cron`), schéma interne `rtdash`, types `enum`, `rtdash.f_unaccent`. **Tests d'abord** : test structurel pgTAP (design § 6.6), dont les objets « sondes » créés par `rtdash_owner`. *Réf.* design § 4, § 6.1, § 6.6.
- [x] **T-2.3** Sessions en base : table `rtdash.sessions`, fonctions `open_session`, `close_session`, `rtdash.use_session`, purge `pg_cron` des sessions expirées depuis 90 jours. Côté application : `withSession(token, fn)` (transaction + `use_session`). **Tests d'abord** (pgTAP + intégration) : session valide, expirée, fermée, inventée ; `rtdash_app` ne lit pas `rtdash.sessions` ; seule l'empreinte du jeton est stockée ; test « sans session » (design § 6.6). 🧑 Ajouter `http://localhost:3000/auth/callback` dans l'application Discord et renseigner `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` dans `.env.development.local` (jamais dans la discussion). *Réf.* design § 5.1, § 5.2, § 6.1.
- [x] **T-2.4** Flux de connexion : `/auth/login` (`state` + PKCE, cookie 10 min), `/auth/callback` (vérification de `state`, échange du code, `GET /users/@me`, `open_session`, cookie `__Host-rtdash_session`), `/auth/logout` (POST, `close_session`), `proxy.ts` (sans cookie → `/login`), page `/login` (reprise ; capture à valider), accueil provisoire avec le pseudo de la session. `/api/health` vérifie la base. **Tests d'abord** : `state` absent ou faux, code refusé par Discord, profil invalide, déconnexion. *Fini quand* connexion et déconnexion fonctionnent avec un vrai compte Discord en local. *Réf.* R-ACC-01, design § 5.2–5.3, L-01.
- [ ] **T-2.5** CI : construction de l'image `db/`, migrations rejouées depuis zéro, `pnpm db:test`, tests d'intégration, contrôle « types à jour » ; e2e sur le build de production avec la base, sessions de test créées en base (design § 15). Publication de l'image `rt-dash-db` sur GHCR dans `deploy.yml`. *Fini quand* tous les jobs sont verts sur GitHub. *Réf.* design § 14, L-07.
- [ ] **T-2.6** Production : `docker-compose.yml` (services `db`, `migrate`, volume `route_images` pour l'app ; base sans port publié), `.env.example` (variables du design § 13.3), test de la configuration du conteneur mis à jour ; `deploy.yml` (migrations et premier superadmin par SSH, toujours désactivés par `DEPLOY_ENABLED`). *Fini quand* `docker compose up` en local (`DOMAIN=localhost`) sert l'app branchée sur sa base, derrière Caddy. *Réf.* design § 13.2–13.3, § 14.
- [ ] **T-2.7** Sauvegardes : `scripts/vps/backup.sh` (`pg_dump` + volume `route_images` → `age` vers la sortie standard, rien en clair sur le disque) et `backup.yml` (SSH, artefact 30 jours, désactivé par `BACKUP_ENABLED` jusqu'à la mise en service). 🧑 Génère la paire de clés `age` ; la clé privée reste chez toi. *Fini quand* le script lancé sur la pile `docker compose` locale produit une sauvegarde chiffrée que tu sais déchiffrer. *Réf.* design § 13.6.

## Phase 3 — Rôles, accès et administration

- [ ] **T-3.1** Migration : `app_users`, `activity_log` ; fonctions `rtdash.current_app_user_id()`, `current_viewer()` (ID Discord lu dans la session, L-01), `sync_my_profile()` ; triggers `forbid_delete`, `activity_log_append_only`, `set_actor_columns`, `audit_row` ; RLS de `app_users` et `activity_log`. **Tests pgTAP d'abord** : suppression refusée ; historique non modifiable ; ligne d'audit avec acteur (déduit de la session), action et changements ; acteur absent = Système ; un utilisateur ne lit que sa ligne ; une session inventée ou d'un autre utilisateur ne permet pas d'agir à sa place. *Réf.* R-AUD-01..05, design § 5.3, § 6.
- [ ] **T-3.2** Droits : `roles.ts` (libellés FR), `permissions.ts` (`permissionsOf`, `can`) et `rtdash.has_permission()` en SQL. **Tests d'abord** : matrice complète en TypeScript **et** test de concordance TypeScript ↔ SQL. *Réf.* specs § 2.2, R-ROLE-09, design § 5.4.
- [ ] **T-3.3** Règles d'administration des comptes : **table de cas partagée** (rôle de l'acteur × rôle de la cible × ajouter, changer le rôle, désactiver, réactiver, basculer comptable, se modifier soi-même) ; `canApplyUserChange` (TypeScript, pour l'affichage) et `admin_save_user` (SQL, fait foi). **Tests d'abord** sur les deux, avec la même table. *Réf.* R-ROLE-05..08, Q-08, design § 5.4.
- [ ] **T-3.4** `getViewer()` (cache par requête), `requirePermission()`, appel de `sync_my_profile()` au callback. *Fini quand* un test vérifie qu'un compte désactivé ou absent donne `null`. *Réf.* R-ACC-02..06.
- [ ] **T-3.4b** **`defineAction({ permission, input, run })`**, seul moyen d'écrire une Server Action (session → viewer → droit → Zod → `run` avec le client de l'utilisateur). Garde-fous automatiques : (a) un test échoue si une action exportée d'un dossier `actions/` n'utilise pas `defineAction` ; (b) **test de la matrice des droits** des actions (chaque action × chaque rôle + comptable + désactivé + non enregistré), enrichi à chaque nouvelle action. *Réf.* design § 16.1 (couche 4).
- [ ] **T-3.5** Page `/acces-refuse` : **maquette `Acces`** (carte 460 px, logo 260 px, cercle violet, « Vous n'avez pas accès », pseudo Discord, unique bouton « Se déconnecter ») ; garde dans `(app)/layout.tsx`. *Fini quand* un compte non enregistré ne voit que cette page (test e2e). *Réf.* R-ACC-03, maquette `Acces.dc.html`.
- [ ] **T-3.6** `rtdash.bootstrap_superadmin(discord_id)` (exécutable par `rtdash_owner` seulement) + appel dans `db/seed.sql` (local). Tests : sans effet si un superadmin actif existe ; refusé pour `rtdash_app`. *Réf.* R-ACC-07, design § 5.5.
- [ ] **T-3.7** Paramètres → Utilisateurs (`src/admin/users/`, découpé en composants : liste, ligne, formulaire d'ajout, boîte de changement de rôle…) : liste (nom, ID Discord, rôle, comptable, actif) ; ajout (ID Discord en 17 à 20 chiffres, rôle, comptable) ; changement de rôle ; désactivation et réactivation ; historique de chaque compte. Boutons affichés selon `canApplyUserChange`, actions passant par `admin_save_user`. Écran hors maquette : capture à valider. *Réf.* R-SET-01, US-03..07.
- [ ] **T-3.8** E2E et API : la direction ne peut ni promouvoir en superadmin ni désactiver un compte direction (bouton absent, appel de la Server Action refusé, **appel SQL direct de `admin_save_user` avec sa session (rôle `rtdash_app`) refusé**).

## Phase 4 — Coque du dashboard

- [ ] **T-4.1** Tokens dans `globals.css` (palette, teintes dérivées, statuts, rayons, variables shadcn, `@theme inline`), **exactement** comme le design § 10. Plus Jakarta Sans via `next/font`. *Fini quand* changer `--rt-yellow` recolore tout le site. *Réf.* specs § 0, design § 10.
- [ ] **T-4.2** Installer et thémer les composants shadcn de base (Button, Input, Textarea, Select, Dialog, Tabs, Table, Command, Tooltip, Sonner). Créer `PillButton`, `StatusPill`, `Panel`, `Field`, `Avatar` (un fichier chacun). Page interne `/dev/ui` (hors production) qui les affiche tous. *Réf.* design § 10.2, maquettes.
- [ ] **T-4.3** Copier les logos dans `public/brand/` ; favicon « V » blanc en thème sombre, noir en thème clair.
- [ ] **T-4.4** Registre d'outils (`core/tools`) : types `ToolManifest` (avec `ownerRoles`), `TOOLS`, filtrage par droits. Tests unitaires du filtrage. *Réf.* R-TOOL-01..02, design § 3.1.
- [ ] **T-4.5** `components/layout/` : `AppShell`, `Sidebar`, `SidebarNavItem`, `SidebarRoleLabel`… (240 px, libellé du rôle, liens de l'outil, état actif jaune, emplacement des cartes d'alerte, Paramètres et Déconnexion en bas), construits depuis le registre. *Réf.* maquette `Main` (barre latérale).
- [ ] **T-4.6** `PageHeader` et ses sous-composants (titre, sous-titre, boutons ronds recherche et cloche, avatar + nom + rôle). *Réf.* maquette `Main` (en-tête).
- [ ] **T-4.7** Accueil `(app)/page.tsx` : affiche les `Dashboard` des outils accessibles ; sinon le message « Aucun outil n'est encore disponible pour votre rôle ». *Réf.* R-TOOL-03.
- [ ] **T-4.8** Squelette de la recherche : `SearchProvider`, `globalSearch` (vide), palette `Command` + raccourci Ctrl/⌘+K (hook `use-search-shortcut`), fournisseur `core.navigation`. *Réf.* design § 12.1.
- [ ] **T-4.9** Squelette des notifications : `NotificationProvider`, badge de la cloche, liste déroulante. *Réf.* design § 12.2.
- [ ] **T-4.10** Fuseau : `core/time/paris.ts` (`toParis`, `fromParisLocal(date, time)`, `formatMessageDate` → « samedi 7 novembre », `formatMessageTime` → « 21H30 », `formatHistoryDate` → « 13 oct. 2026 · 09:18 »). **Tests d'abord** : changements d'heure (29/03/2026, 25/10/2026), heure inexistante refusée, heure ambiguë = première occurrence, RDV après le départ = veille, `09:00` → `09H00`. Vérifier dans l'image Docker que l'ICU française est présente. *Réf.* R-TIME-01..07.
- [ ] **T-4.11** Capture de la coque pour validation (comparée à `Main` et à l'image de référence).

## Phase 5 — Tickets (avec client API TruckersMP)

- [ ] **T-5.1** Migration : `countries`, `cities` (vides), `settings`, `tickets` (contraintes, index, unicité de l'événement actif, `tmp_snapshot` facultatif), vue `tickets_v` (`security_invoker`), trigger `ticket_guard`, triggers d'audit et d'acteur branchés ; RLS et **colonnes autorisées** (design § 6.2) ; fonctions `take_ticket`, `accept_ticket` (initialisation à la 1re acceptation : consignes et valeurs par défaut dans les champs vides), `refuse_ticket`, `change_ticket_status`. **Tests pgTAP d'abord** : toutes les transitions permises hors archive ; motif obligatoire à chaque refus ; `handler_id` requis hors `new` ; doublon d'événement actif refusé ; colonnes de parcours non modifiables directement ; données conservées après « désacceptation » ; valeurs par défaut sans écrasement ; chaque rôle vérifié. *Réf.* design § 4, § 6.
- [ ] **T-5.2** `truckersmp/parse-url.ts` : **tests d'abord** (avec ou sans slug, `www`, `/` final, liens invalides). *Réf.* R-TKT-02.
- [ ] **T-5.3** `truckersmp/schema.ts` (Zod) + `client.ts` (User-Agent, délai de 10 s, 1 nouvel essai sur 5xx et erreur réseau, pas sur 404). Tests avec un `fetch` simulé et la fixture `docs/design/truckersmp-event-36491.json`. **Relever le format réel d'une réponse 404** (un appel réel, avec l'accord de l'utilisateur) et l'ajouter en fixture. *Réf.* design § 7.
- [ ] **T-5.4** `truckersmp/mapping.ts` : **tests d'abord** avec la fixture : nom « Limpens Franco-Bohemian Convoy », entreprise vide (`vtc.id = 0`), départ 2026-11-07 20:30 UTC (= 21H30 Paris), RDV 19:30 UTC (= 20H30), serveur « Event Server », DLCs « Aucun », villes et lieux, `tmp_url`, `map`. Plus un cas DLCs non vides (`{"227310":"Going East!","925580":"Beyond the Baltic Sea"}` → « Going East!, Beyond the Baltic Sea »). *Réf.* specs § 7.2.
- [ ] **T-5.5** Action `add-ticket` : droits → analyse du lien → doublon → appel API → mapping → résolution des villes (fournisseur provisoire « toujours inconnu » jusqu'à la phase 7) → insertion (historique automatique). Messages d'erreur clairs (lien invalide, introuvable, doublon avec lien). Événement d'un autre jeu (ATS) : avertissement non bloquant. *Réf.* R-TKT-01..04, US-10..11.
- [ ] **T-5.5b** **Création manuelle** si l'API est indisponible : `add-ticket` renvoie `api_unavailable` → formulaire (lien + nom, entreprise, date, RDV, départ ; villes et lieux facultatifs) → ticket avec `tmp_snapshot = null` et pastille « Données TruckersMP manquantes ». Tests : 5xx et délai dépassé → formulaire proposé ; 404 → non. *Réf.* R-TKT-05.
- [ ] **T-5.6** Page Tickets, **maquette `Tickets`**, découpée en composants (`AddTicketForm`, `StatusTabs`, `TicketsTable`, `TicketRow`, `TruckersmpLink`…) : section jaune « Ajouter un ticket » ; onglets avec compteurs (Tous, Nouveau, En analyse, Accepté, Refusé, Archive) ; tableau (Convoi, Entreprise, Date, RDV, Départ, Statut, Traité par, Action) ; motif sous le nom pour les refusés ; lien « Voir sur TruckersMP ↗ » sous le nom ; boutons « Analyser », « Reprendre », « Voir le convoi », « Historique ». *Réf.* US-12, R-TKT-06, maquette `Tickets.dc.html`.
- [ ] **T-5.7** Server Actions minces (une par fichier) qui appellent les fonctions SQL de T-5.1, ouvertes à **tout membre ayant l'outil** : `take-ticket`, `accept-ticket` (+ copie de l'image `map` sur le volume des images à la 1re acceptation, puis enregistrement de `route_image_path`), `refuse-ticket` (motif obligatoire), `change-ticket-status`. Ajoutées au test de la matrice des droits. *Réf.* R-TKT-10..15, R-CNV-01, R-CNV-05..08.
- [ ] **T-5.8** Détail du ticket : infos de base, lien « Voir sur TruckersMP ↗ », pastille de statut, responsable actuel, boutons Prendre en charge / Accepter / Refuser / Changer de statut, boîte de dialogue de refus avec motif obligatoire, historique. Écran hors maquette : capture à valider. *Réf.* specs § 5.3, R-AUD-04.
- [ ] **T-5.9** `HistoryList` + mise en forme de l'historique (`domain/` : correspondance champ → libellé FR, action → phrase, dates Europe/Paris, « Système »). Tests de mise en forme. *Réf.* design § 6.7, maquette `Convoi` (Historique).
- [ ] **T-5.10** E2E : ajouter (API simulée) → analyser → accepter ; accepter directement depuis Nouveau ; refuser sans motif (bloqué) puis avec motif ; un second chargé reprend la main ; Accepté → En analyse → Accepté (convoi retrouvé intact).

## Phase 6 — Convois (formulaire, Actualiser, image, paramètres)

- [ ] **T-6.1** Page Convoi `/convois/[id]`, **maquette `Convoi`**, découpée par section (`ConvoyHeader`, `GeneralInfoSection`, `RouteSection`, `LinksAndInstructionsSection`, `HistorySection`) ; état du formulaire dans un hook `use-convoy-form`. En-tête (retour, nom, pastille « Ticket accepté · convoi créé », « Accepté par … le … à … », lien « Voir sur TruckersMP ↗ », « Voir le ticket », « Enregistrer ») ; colonne de droite réservée à l'aperçu (phase 8). Date en sélecteur, heures `HH:MM`. *Réf.* R-CNV-02..04, R-TIME-04, maquette `Convoi.dc.html`.
- [ ] **T-6.2** Schéma Zod partagé du formulaire (`domain/`) + action `save-convoy` : seuls les champs modifiés sont envoyés, conversion Paris → UTC, mise à jour directe des colonnes autorisées (refusée par la base si archivé). Accent grave `` ` `` refusé dans les champs en code, avec message clair ; une valeur préremplie qui en contient est signalée. Test d'intégration : une ligne d'historique avec chaque champ (ancien → nouveau). *Réf.* R-CNV-04, R-CNV-09, R-AUD-03, US-20.
- [ ] **T-6.3** `CountryField` (connu : texte jaune ; inconnu : bouton violet « Pays à compléter · Compléter ») relié au pop-up (phase 7). *Réf.* R-MSG-11.
- [ ] **T-6.4** Image du trajet : affichage (route qui relit le ticket sous RLS puis sert le fichier du volume, `Cache-Control: private, no-store`), remplacement par envoi (PNG, JPEG ou WebP, 8 Mo max, vérification des premiers octets, **ré-encodage côté serveur**), historique. Tests avec un fichier piégé. *Réf.* R-CNV-06..07, US-22.
- [ ] **T-6.5** `truckersmp/diff.ts` : **tests d'abord** (aucune différence, différences multiples, champ modifié à la main). Puis action `refresh-from-truckersmp` (étape 1 : différences ; étape 2 : appliquer la sélection) + boîte de dialogue « Actualiser » (cases cochées par défaut). Fonctionne aussi pour remplir un ticket créé à la main. Écran hors maquette : capture à valider. *Réf.* R-TKT-30..32, US-18.
- [ ] **T-6.6** Liste des convois `/convois` (à venir puis passés non archivés ; mêmes composants de tableau que les Tickets). Écran hors maquette : capture à valider.
- [ ] **T-6.7** Paramètres → **Outil convois** (droit `convoys:settings` : chargés d'événementiel, direction, superadmin) : modèle global des consignes + valeurs par défaut (Cibi, Pause, GPS, Distance, Cargaison, Lien TB ; valeurs initiales de R-CNV-08), historisés. *Réf.* R-SET-02, R-CNV-05, R-CNV-08, R-ROLE-09.
- [ ] **T-6.8** E2E : modifier l'heure de départ → l'historique montre « 21:00 → 21:30 ».

## Phase 7 — Villes et pays

- [ ] **T-7.1** 🧑 + moi : extraction des fichiers du jeu (SCS Extractor) pour le jeu de base et **tous les DLC cartes**. Pas de ProMods (Q-17). Relever la structure réelle de `def/city/*.sui`, des définitions de pays et de la traduction française ; mettre à jour le design § 8.1 si elle diffère. *Réf.* R-CITY-02, design § 8.1.
- [ ] **T-7.2** `scripts/cities/parse.ts` : **tests d'abord** sur des extraits réels copiés en fixture ; échec bruyant sur une entrée incomprise. Produit `db/seed/countries.json` et `cities.json`.
- [ ] **T-7.3** Rapport de vérification `db/seed/cities.report.md` : nombre par pays, homonymes, rejets, couverture des villes des événements `GET /v2/events`, échantillon de 20 villes vérifiées à la main par toi 🧑. *Fini quand* tu as validé le rapport. *Réf.* design § 8.2.
- [ ] **T-7.4** Chargement : le script génère une **migration de données** (upsert idempotent des pays et des villes, `source = 'initial'`), appliquée partout par dbmate comme le reste du schéma. Test : deux exécutions donnent le même résultat.
- [ ] **T-7.5** `core/cities/normalize.ts` + `resolve.ts` : **tests d'abord** (casse, accents, espaces ; inconnue, unique, homonyme avec suggestion `last_chosen_at`). Brancher sur `add-ticket` à la place du fournisseur provisoire. *Réf.* R-CITY-06..07, design § 8.3.
- [ ] **T-7.6** Fonction SQL `complete_cities` + action `complete-cities` : inconnue → ville apprise + propagation aux tickets non archivés ; homonyme → `last_chosen_at` + ce ticket seulement ; modification d'une ville existante ; pays saisi via « Autre pays… » → pays appris, sans doublon (`name_key`) ; historique (`country_set`, `learned`). Tests pgTAP et d'intégration. *Réf.* R-CITY-04..06, R-CITY-09..10, R-CITY-12.
- [ ] **T-7.7** `CitiesDialog`, **maquette `Ville`**, découpé (`CitiesDialog`, `CityChoiceRow`, `CountrySelect`…) : titre « Villes à compléter », texte avec le nom du ticket, une ligne par ville avec son rôle (Départ ou Arrivée), liste des pays, homonymes présélectionnés, « Plus tard », « Enregistrer et mémoriser », plus l'entrée « Autre pays… » en bas de la liste (hors maquette : capture à valider). Ouverture automatique après l'ajout d'un ticket s'il y a des villes à compléter. *Réf.* US-30..32, R-CITY-12, maquette `Ville.dc.html`.
- [ ] **T-7.8** Page « Villes et pays » : tableau (nom, pays, source), recherche, filtres, modification du pays, ajout d'une ville et d'un pays (R-CITY-12), historique. Écran hors maquette : capture à valider. *Réf.* R-CITY-08, US-33.
- [ ] **T-7.9** Table `city_aliases` alimentée par l'apprentissage, pour les écarts de nommage entre TruckersMP et le jeu (Q-15).

## Phase 8 — Message et aperçu Discord

- [ ] **T-8.1** `discord/domain/build-message.ts` : **test golden d'abord**. Avec l'exemple de specs § 8.4, la sortie doit être **identique octet par octet** au fichier de référence, qu'on ne modifie jamais pour faire passer le test. Plus des tests : pays inconnu → « pays à compléter », consignes sur 1 ligne puis 3 lignes, consignes vides, lien TB rempli, heure 09:00 → `09H00`, date en heure d'été, erreur si une valeur contient `` ` ``. *Réf.* R-MSG-01, R-MSG-06, R-MSG-10..11, specs § 8.2.
- [ ] **T-8.2** **Spike** du parseur Markdown Discord (candidat `discord-markdown-parser`) sur le fichier de référence : `** Date :**` en gras, gras sur deux lignes dans la citation, gras final sur deux lignes, code en ligne, italique, URL brute, titres. Résultat écrit dans le design § 9.2. En cas d'échec : petit parseur dédié + tests.
- [ ] **T-8.3** `DiscordMessagePreview`, découpé (`DiscordMessageHeader`, `DiscordMarkdown`, `DiscordAttachment`, `DiscordReactions`…) : en-tête RavenBot (avatar : texte « RAVENBot » tant que l'image manque, Q-20 ; badge APP ; horodatage), rendu Markdown → React (sans HTML brut), Twemoji, image en carte, réactions d'exemple, pastille « En direct », note. Tokens `--discord-*` du design § 9.2. *Réf.* R-MSG-02..05, maquette `Convoi.dc.html` (aperçu), capture `message-convoi-exemple.png`.
- [ ] **T-8.4** Branchement en direct sur le formulaire du convoi (hook `use-convoy-message-preview` : `watch()` → `buildConvoyMessage`), résolution des pays côté client avec l'index des villes. *Fini quand* chaque frappe met à jour l'aperçu. *Réf.* R-MSG-04, US-21.
- [ ] **T-8.5** Comparaison visuelle (Playwright) de l'aperçu de l'exemple avec la capture de référence. **Validation humaine 🧑** de la ressemblance.
- [ ] **T-8.6** Compteur de caractères sous l'aperçu, en alerte au-delà de 2000 (Q-02).

## Phase 9 — Archivage

- [ ] **T-9.1** Migration : `rtdash.archive_due_tickets()` (interne) + `cron.schedule` toutes les 5 min. **Tests pgTAP d'abord** : échéance = départ + 6 h exactement (y compris un jour de changement d'heure), tous statuts, acteur Système, historique « archivé ». *Réf.* R-ARC-01..03, R-AUD-05, design § 11.
- [ ] **T-9.2** Lecture seule : `ticket_guard` refuse toute modification après l'échéance, même sans passage du job. Côté interface : champs désactivés, aucun bouton d'action, bandeau « Archivé ». Tests (pgTAP + e2e). *Réf.* R-ARC-05, R-ARC-07.
- [ ] **T-9.3** Archivage manuel d'un refusé : fonction `archive_refused_ticket` + action + bouton avec confirmation + historique. *Réf.* R-ARC-04, US-16.
- [ ] **T-9.4** Onglet Archive des Tickets + page Archive de la barre latérale (filtres par statut d'origine). Écran hors maquette : capture à valider. *Réf.* R-ARC-06.

## Phase 10 — Dashboard, recherche, notifications

- [ ] **T-10.1** Dashboard événementiel, **maquette `Main`**, découpé (`KpiCards`, `KpiCard`, `RecentHistory`, `NextConvoyCard`, `TicketsToHandle`, `TicketCard`) : 3 cartes KPI, historique récent, prochain convoi, colonne « Tickets à traiter » (« Tout voir »). Requêtes testées. *Réf.* R-DSH-01, R-DSH-03..06.
- [ ] **T-10.2** Graphique d'activité (« Reçus » / « Acceptés » depuis `activity_log`, 28 jours glissants, un point par jour). *Réf.* R-DSH-02.
- [ ] **T-10.3** Fonctions `search_tickets` et `search_cities` (`security invoker`) + fournisseurs de recherche : `convois.tickets` (archive comprise, pastille), `convois.cities`, actions (aller vers chaque page + « Ajouter un ticket »). Tests : accents, fautes légères, droits (un rôle sans outil ne voit aucun ticket). *Réf.* R-SRC-01..04, design § 12.1.
- [ ] **T-10.4** Fournisseur de notifications `convois.cities-pending` : cloche (badge + liste) + carte violette de la barre latérale (« N villes n'ont pas encore de pays » + « Compléter »). *Réf.* R-NOT-01..04, maquette `Main` (carte de la barre latérale).

## Phase 11 — Tests finaux, sécurité et déploiement

- [ ] **T-11.1** Revue de couverture : chaque règle `R-…` des specs a au moins un test ou une vérification e2e (tableau de correspondance dans `tests/README.md`).
- [ ] **T-11.2** Contrôle : l'application ne contient aucune route ni variable de connexion de test (les sessions de test sont créées en base par Playwright) ; un test de la CI le vérifie. *Réf.* design § 15.
- [ ] **T-11.3** **Revue de sécurité** : `/security-review` + liste du design § 16.1 ligne par ligne + tests d'attaque simples (appel direct de chaque action par chaque rôle et sans session ; **requêtes SQL directes avec le rôle `rtdash_app` et une vraie session de chaque rôle** ; sans session, session expirée, fermée ou inventée ; port Postgres injoignable de l'extérieur ; fichier piégé ; en-têtes ; scan des ports). Rapport `docs/security-review.md`. **Aucune mise en production tant qu'un point bloquant reste ouvert.** *Réf.* design § 16.2.
- [ ] **T-11.4** 🧑 + moi : préparer le VPS **Debian 12** avec `scripts/vps/setup.sh` (utilisateur `deploy`, SSH par clé uniquement, root désactivé, `ufw` 22/80/443, `fail2ban`, `unattended-upgrades`, Docker officiel), DNS → VPS, scan des ports depuis l'extérieur. ⛔ Q-25. *Réf.* design § 13.7.
- [ ] **T-11.5** Secrets GitHub (`production`, design § 13.3) ; `.env` du VPS (mots de passe Postgres générés, secret Discord) ; activer migration, superadmin et SSH dans `deploy.yml` (`DEPLOY_ENABLED`) puis les sauvegardes (`BACKUP_ENABLED`) ; **demander la confirmation explicite de l'utilisateur**, puis premier déploiement ; vérification de `/api/health` et du HTTPS.
- [ ] **T-11.6** 🧑 Redirection Discord de production (`APP_URL/auth/callback`) ; premier lancement de `backup.yml` et déchiffrement de l'archive ; contrôle que `cron.job` existe ; vérification que les villes sont chargées.
- [ ] **T-11.7** Recette guidée 🧑 : tout le parcours de specs § 3 avec de vrais comptes Discord (événementiel, direction, superadmin, non autorisé).
- [ ] **T-11.8** `docs/runbook.md` : déployer, revenir à une version précédente (`TAG=<sha>`), changer de VPS (design § 13.4), restaurer une sauvegarde. **Tester une restauration complète** dans une base locale neuve (image `db/`) avant la mise en production (design § 13.6).

---

## Suivi des dépendances principales

```
P0 ─▶ P1 ─▶ P2 ─▶ P3 ─▶ P4 ─▶ P5 ─▶ P6 ─▶ P8
                                 │      └──▶ P9
                                 └─▶ P7 (T-7.1 à T-7.3 peuvent démarrer dès P2, en parallèle)
P5 + P6 + P7 ─▶ P10 ─▶ P11
T-8.1 (générateur, fonction pure) peut être fait à tout moment après T-4.10.
```
