# RT-Dash

Dashboard d'administration d'une VTC Euro Truck Simulator 2 (TruckersMP) : Next.js (TypeScript), Postgres 17 (Docker), Docker Compose, GitHub Actions.

## Documentation

- [CLAUDE.md](CLAUDE.md) : règles de travail du projet (à lire en premier).
- [docs/specs.md](docs/specs.md) : spécifications fonctionnelles.
- [docs/design.md](docs/design.md) : architecture, sécurité, conventions de code.
- [docs/tasks.md](docs/tasks.md) : plan de développement par phases.
- [docs/comptes-rendus/](docs/comptes-rendus/) : compte rendu de chaque phase.

## Prérequis

- Node.js 24 et pnpm 11 (`corepack enable` ou `npm install --global pnpm@11`).
- Docker (image de l'application et base Postgres locale).

## Lancer en local

```bash
pnpm install
pnpm db:reset       # base locale neuve (Docker) + migrations
pnpm dev            # http://localhost:3000
```

Les connexions locales vont dans `.env.development.local` (jamais commité) : `APP_URL`, `DATABASE_URL` (rôle `rtdash_app`), `DATABASE_OWNER_URL` (rôle `rtdash_owner`, migrations), identifiants Discord.

## Base de données

```bash
pnpm db:up          # démarre la base locale (compose.dev.yml)
pnpm db:migrate     # applique les nouvelles migrations (db/migrations, dbmate)
pnpm db:reset       # repart d'une base vide
pnpm db:test        # tests pgTAP (db/tests)
pnpm db:types       # régénère src/core/db/database.types.ts
```

## Vérifications (les mêmes qu'en CI)

```bash
pnpm lint           # ESLint, zéro avertissement toléré
pnpm typecheck      # TypeScript
pnpm format:check   # Prettier
pnpm test           # tests unitaires et d'intégration (Vitest ; base locale démarrée)
pnpm test:e2e       # build de production + tests Playwright
```

Avant le premier `pnpm test:e2e` : `pnpm exec playwright install chromium`.

## Docker

```bash
docker build -t rt-dash:local .
docker run --rm -p 3000:3000 rt-dash:local   # http://localhost:3000/api/health
```

En production, `docker-compose.yml` lance l'application derrière Caddy (HTTPS automatique).

## Variables d'environnement

Le modèle commenté est [`.env.example`](.env.example) : il liste **uniquement** les variables du serveur (design § 13.3). Les copier dans `.env` (serveur) ou `.env.local` (poste), jamais commités. Les secrets du déploiement (accès SSH, clé publique des sauvegardes) ne vont que dans les secrets GitHub.

## CI/CD

- `.github/workflows/ci.yml` : à chaque push, qualité, sécurité, tests, build et scan de l'image.
- `.github/workflows/deploy.yml` : après une CI verte sur `main`, publication de l'image sur GHCR. Le déploiement sur le VPS est désactivé tant que la variable `DEPLOY_ENABLED` ne vaut pas `true` (phase 11).
