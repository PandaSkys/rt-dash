# RT-Dash

Dashboard d'administration d'une VTC Euro Truck Simulator 2 (TruckersMP) : Next.js (TypeScript), Supabase, Docker, GitHub Actions.

## Documentation

- [CLAUDE.md](CLAUDE.md) : règles de travail du projet (à lire en premier).
- [docs/specs.md](docs/specs.md) : spécifications fonctionnelles.
- [docs/design.md](docs/design.md) : architecture, sécurité, conventions de code.
- [docs/tasks.md](docs/tasks.md) : plan de développement par phases.
- [docs/comptes-rendus/](docs/comptes-rendus/) : compte rendu de chaque phase.

## Prérequis

- Node.js 24 et pnpm 11 (`corepack enable` ou `npm install --global pnpm@11`).
- Docker (pour l'image et, à partir de la phase 2, Supabase local).

## Lancer en local

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

## Vérifications (les mêmes qu'en CI)

```bash
pnpm lint           # ESLint, zéro avertissement toléré
pnpm typecheck      # TypeScript
pnpm format:check   # Prettier
pnpm test           # tests unitaires et d'intégration (Vitest)
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

Le modèle commenté est [`.env.example`](.env.example) : il liste **uniquement** les variables du serveur (design § 13.3). Les copier dans `.env` (serveur) ou `.env.local` (poste), jamais commités. Les secrets de la CI (clé `service_role`, connexions à la base, accès SSH) ne vont que dans les secrets GitHub.

## CI/CD

- `.github/workflows/ci.yml` : à chaque push, qualité, sécurité, tests, build et scan de l'image.
- `.github/workflows/deploy.yml` : après une CI verte sur `main`, publication de l'image sur GHCR. Le déploiement sur le VPS est désactivé tant que la variable `DEPLOY_ENABLED` ne vaut pas `true` (phase 11).
