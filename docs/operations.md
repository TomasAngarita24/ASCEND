# Operations

Operational notes for running, upgrading, backing up and exposing ASCEND.

## Requirements

- Node.js >= 22 (see `.nvmrc`). Docker with the Compose plugin.
- Local development needs `.env` at the repo root with at least:

  ```dotenv
  POSTGRES_DB=ascend
  POSTGRES_USER=ascend
  POSTGRES_PASSWORD=<strong password>
  JWT_ACCESS_SECRET=<at least 32 characters>
  APP_URL=http://localhost:5173
  ```

## Single-command deployment (Docker Compose)

Base stack (plain HTTP, nginx serves the SPA and proxies the API):

```bash
docker compose up -d --build
# Web:   http://localhost:8080
# API:   http://localhost:8080/health
```

Artifacts built from source: `web/Dockerfile` (Vite build → nginx) and
`backend/Dockerfile` (Node 24, Prisma migrate on boot, `dist/server.js`).

### Automatic HTTPS with Caddy (optional)

Stack Caddy in front of the web container:

```bash
docker compose -f compose.yaml -f compose.caddy.yaml up -d --build
```

- Set `APP_DOMAIN=your.domain.com` in `.env`, then open `https://your.domain.com`.
  Caddy obtains and renews Let's Encrypt certificates automatically; ports 80
  and 443 must be reachable from the internet.
- Without `APP_DOMAIN` it defaults to `localhost` and serves `https://localhost`
  with Caddy's internal CA (local testing only).
- The `Caddyfile` terminates TLS and proxies everything to the `web` container,
  which keeps doing SPA serving and API proxying.

## Backups

### Creating a backup

```bash
bash scripts/backup-postgres.sh [retention_days]
```

Uses `pg_dump` inside the running `postgres` container and writes a timestamped
[custom-format](https://www.postgresql.org/docs/current/app-pgdump.html) dump to
`backups/ascend-<timestamp>.dump` (compressed, restore-friendly). Backups older
than `retention_days` (default 7) are pruned automatically. `backups/` is
git-ignored; copy dumps elsewhere for long-term storage.

Requires the stack to be up (`docker compose up -d postgres` is enough).

### Restoring

```bash
bash scripts/restore-postgres.sh backups/ascend-<timestamp>.dump
```

Manual equivalent (also works on Windows PowerShell with the container's dump
copied to `pg_dump`/`pg_restore` aliases):

```bash
docker compose exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-acl \
  < backups/ascend-<timestamp>.dump
```

Notes:

- `--clean --if-exists` drops existing objects before recreating them, so the
  restore is idempotent against an existing schema. The target database must
  already exist.
- Stop writes during the restore if you need a consistent state at the exact
  snapshot point; a custom-format dump is internally consistent for the moment
  it was taken.
- Credentials come from the repo `.env` (`POSTGRES_USER`, `POSTGRES_DB`,
  `POSTGRES_PASSWORD`), so the compose stack reads the same ones.

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every push and pull request:

- **Web job:** `npm ci`, oxlint, `tsc -b && vite build`, full Vitest suite.
- **Backend job:** spins up a `postgres:18-alpine` service container, installs
  the build tools argon2 needs (`python3 make g++`), generates the Prisma
  client, applies migrations (`prisma migrate deploy`), then runs oxlint,
  `tsc --noEmit`, the production build, and the full test suite.

Both jobs use the Node version pinned in `.nvmrc` (`22`).

Local equivalents of what CI runs:

```bash
# Web
cd web && npm ci && npm run lint && npm run build && npm test

# Backend (needs local Postgres + backend/.env)
cd backend && npm run lint && npm run typecheck && npm run build && npm test
```

## Node version

`.nvmrc` pins Node 22 (also enforced via `engines` in both `package.json`).
Install with:

```bash
nvm install           # or: nvm use
```

## Rate limiting on authentication

Login/register endpoints are protected by three stacked limits (see
`backend/src/middleware/rate-limit.ts`):

| Limiter                | Scope               | Limit            |
| ---------------------- | ------------------- | ---------------- |
| `authLimiter`          | all `/auth` routes  | 60/min per IP    |
| `credentialLimiter`    | login/register      | 20/min per IP    |
| `perEmailCredentialLimiter` | login/register | 5/min per email+IP |

All rejection responses share the uniform envelope
`{ "error": { "code", "message" } }`, so clients can branch on the code
(`RATE_LIMITED`, `REGISTRATION_REJECTED`, `INVALID_CREDENTIALS`, ...) without
parsing messages.