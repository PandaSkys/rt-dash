# RT-Dash

Dashboard d'administration d'une VTC Euro Truck Simulator 2 (TruckersMP). Next.js full-stack (TypeScript), **Postgres 17 seul dans Docker** (RLS, fonctions SQL, triggers, pg_cron ; accès par Kysely côté serveur ; migrations dbmate), connexion Discord OAuth2 et sessions gérées par l'application, images sur un volume Docker, Docker Compose, GitHub Actions. **Pas de Supabase** (design D-06).

## Documents fondateurs (à lire avant toute tâche)

- [docs/specs.md](docs/specs.md) : spécifications fonctionnelles, règles `R-…`, questions ouvertes `Q-…`
- [docs/design.md](docs/design.md) : architecture, schéma BDD, RLS, auth, intégrations, **conventions de code (§ 3.2)**, tokens de design, CI/CD, sécurité, **leçons de la première tentative (§ 18)**
- [docs/tasks.md](docs/tasks.md) : plan de développement par phases (`T-…`) et **mode d'emploi** (déroulé d'une tâche, périmètre, compte rendu, définition de « terminé »)
- [docs/comptes-rendus/](docs/comptes-rendus/) : un compte rendu par phase (modèle : `_modele.md`)
- [docs/prompts-phases.md](docs/prompts-phases.md) : prompt de démarrage de chaque phase

**Statut : révision 1.1 du 2026-11-08, validée le 2026-11-09** (abandon de Supabase, D-06 ; révision 1.0 du 2026-11-02 : reprise du code de zéro, méthode de travail). Suivre `docs/tasks.md` phase par phase, dans l'ordre. Toute modification de règle passe d'abord par une mise à jour des documents, validée par l'utilisateur.

## Ressources visuelles (à consulter à chaque étape d'interface)

- [docs/design/reference-dashboard.png](docs/design/reference-dashboard.png) : référence de **structure et de style** (thème sombre, barre latérale gauche, grandes cartes colorées, colonne de cartes à droite, coins très arrondis, boutons en pilule). Les couleurs viennent de la palette RT-Dash, pas de cette image.
- [docs/design/maquette/](docs/design/maquette/) : maquette validée, 5 écrans `.dc.html` (`Main`, `Tickets`, `Convoi`, `Ville`, `Acces`). À lire **comme du code** pour les couleurs, tailles, espacements et textes exacts. Ces fichiers ne s'ouvrent pas seuls dans un navigateur. Les données sont des exemples.
- [docs/design/discord/message-convoi-exemple.png](docs/design/discord/message-convoi-exemple.png) : capture du vrai message RavenBot (référence de l'aperçu Discord ; ignorer le fond violet, utiliser le thème sombre Discord `#313338`).
- [docs/design/discord/message-convoi-exemple.md](docs/design/discord/message-convoi-exemple.md) : source Markdown exacte de ce message, **test golden** du générateur.
- [docs/design/truckersmp-event-36491.json](docs/design/truckersmp-event-36491.json) : vraie réponse de l'API TruckersMP pour l'exemple.
- [docs/design/logos/](docs/design/logos/) : `rt-dash-logo-white|black.png` (logo complet), `rt-dash-mark-white|black.png` (icône « V »).

## Méthode de travail

- **Une tâche à la fois**, dans l'ordre de `docs/tasks.md`, en suivant son « Mode d'emploi ».
- **Périmètre strict** : ne modifier **que** ce que la tâche demande. Pas de refactorisation, de renommage, de reformatage ni de mise à jour de dépendance « en passant ». Si autre chose semble nécessaire : ne pas le faire, le noter dans le compte rendu et demander.
- **Compte rendu** après chaque tâche, dans `docs/comptes-rendus/phase-N.md` (modèle `_modele.md`) : ce qui a été fait, **chaque fichier touché et pourquoi**, comment vérifier, tests, écarts, points ouverts. Bilan en fin de phase, puis **arrêt** jusqu'à la validation de l'utilisateur.
- **Secrets** : ne jamais demander de coller une clé, un mot de passe ou une chaîne de connexion dans la discussion.
- **Git** : commits signés (1Password), jamais contournés ; ne commiter et ne pousser qu'avec l'accord de l'utilisateur.

## Règles de travail

- **Ne rien inventer** : ni règle, ni champ, ni fonctionnalité, ni donnée. Tout manque va dans les « Questions ouvertes » et se demande à l'utilisateur.
- Les champs de l'API TruckersMP se vérifient sur une vraie réponse, jamais de mémoire. Les correspondances ville ↔ pays viennent des fichiers du jeu, jamais de mémoire.
- Interface **en français uniquement** ; identifiants du code en anglais.
- **Aucune couleur en dur** : utiliser les tokens de `src/app/globals.css` (design.md § 10). Texte foncé `#1F1F1F` sur jaune et violet.
- **Rien n'est supprimé** : aucune suppression dans l'interface ; la base l'interdit (triggers).
- **Sécurité = exigence forte** (design.md § 6 et § 16), avec **deux barrières** :
  - Next.js : toute Server Action passe par `defineAction` ; le test de la matrice des droits doit couvrir chaque nouvelle action ;
  - Postgres : RLS sur chaque table, colonnes de parcours modifiables seulement par fonctions SQL, droits par défaut fermés, tests pgTAP rôle par rôle.
  La base n'est accessible que **côté serveur**, avec le rôle restreint `rtdash_app`, et toute requête faite pour un utilisateur passe par `withSession` (la base vérifie elle-même le jeton de session). La base n'est jamais exposée hors du réseau Docker. Le rôle `rtdash_owner` (migrations) n'est jamais utilisé par l'application. Jamais de `NEXT_PUBLIC_*` ni de `dangerouslySetInnerHTML`. L'ID Discord vient uniquement de `GET /users/@me` côté serveur, gardé dans la session ; **jamais** d'une donnée envoyée par le navigateur.
- Droits rangés **par outil** : les rôles propriétaires gèrent leur outil et ses paramètres ; direction et superadmin gèrent tout, sauf les paramètres dangereux réservés au superadmin. La matrice existe en TypeScript et en SQL ; le test de concordance doit rester vert.
- **Historique automatique** : les triggers enregistrent chaque modification (acteur déduit de la session, action, ancien → nouveau). Les changements de statut passent par les fonctions SQL dédiées.
- Schéma, RLS et fonctions uniquement dans `db/migrations/` ; types générés par `pnpm db:types`, jamais écrits à la main.
- Dates stockées en UTC, affichées et saisies en **Europe/Paris** (changement d'heure géré).
- Message Discord : **une seule** fonction `buildConvoyMessage`, pour l'aperçu et pour le futur bot (v2).
- Tests d'abord pour la logique pure et métier (Vitest, pgTAP). Le test golden du message doit rester vert.
- **Code propre, lisible et maintenable par un humain** (pas seulement par Claude) : c'est un objectif à part entière, pas un bonus. Concrètement :
  - composants React petits et à responsabilité unique ; découper dès qu'un composant fait plusieurs choses ;
  - logique réutilisable ou d'état extraite dans des **hooks** dédiés (`use…`), la logique métier pure dans des fonctions testables, hors des composants ;
  - noms explicites (variables, fonctions, fichiers), pas d'abréviations obscures ;
  - fonctions courtes, pas de duplication, pas de fichier fourre-tout ;
  - commentaires seulement pour le « pourquoi » non évident, pas pour paraphraser le code ;
  - structure de dossiers cohérente (par outil/fonctionnalité) et conventions identiques d'un fichier à l'autre.
  Relire son propre code avant de le rendre : si un humain ne le comprend pas en le lisant, le refactorer. Détail et garde-fous ESLint : design.md § 3.2.
- Configuration uniquement par variables d'environnement. Aucune référence en dur à un serveur précis.
