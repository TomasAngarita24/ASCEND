# ASCEND

ASCEND is a workout tracking and training management application. Plan routines, record training sessions in real time with a rest timer, and track progress across volume, frequency, and personal records. It runs on desktop and mobile as a progressive web app (PWA) and is backed by a Node.js API with PostgreSQL.

## Features

### Workout Tracking
- Record weight, repetitions, RPE, and set type.
- Integrated rest timer with sound notification — pause/resume, +30s, and server-pushed end-of-rest reminders.
- View previous performance while recording.
- In-session coaching: suggests a progressive-overload working weight from the last session and flags weekly-volume (deload) warnings.
- Drop sets with an automatic suggested weight (70%, plate-rounded).
- Start a workout from scratch or from a routine.
- Complete or cancel workouts; edit sets afterwards.

### Routines
- Create, edit, duplicate, and delete custom routines.
- Add, remove, and reorder exercises.
- Organize routines into folders.
- Configure target sets, repetitions, and rest time per exercise.
- **Routine templates**: import ready-made full-body, upper/lower, push/pull, and legs templates (barbell or bodyweight).

### Exercise Library
- Browse 150+ illustrated exercises.
- Search (accent-insensitive) and filter by muscle group and equipment.
- Favorites synced to the server and tolerant to offline use (queued and replayed when back online).
- Create custom exercises.
- Muscle group targeting metadata powers progress and balance views.

### Progress & Analytics
- Training volume, workout frequency, total sets and repetitions.
- Personal records (PRs) per exercise.
- Weekly muscle-set targets (10–20 sets guideline) with daily/weekly tracking.
- Muscle balance distribution across groups.

### Social
- Public profiles with bio and stats.
- Follow/unfollow other athletes.
- Social feed with posts, likes, and comments.
- Share completed workouts and routines.
- Share routines by direct link (`/r/:routineId`).
- Copy another user's shared routine into your library.
- Search people by name or username.

### Tools & Data
- Plate calculator (exact per-side weight distribution).
- Body measurements tracking (weight and circumference).
- Password reset with email links (Resend) — falls back to console logging without an API key.
- Google OAuth sign-in.
- JSON/CSV export, JSON import/backup restore.
- Offline action queue that replays when the network returns.
- Installable PWA with an "Install app" button, update prompt, and offline-first shell.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router 7, PWA |
| Backend | Node.js, Express, TypeScript, Zod |
| Data | PostgreSQL, Prisma ORM |
| Auth | JWT (access + refresh), Argon2, Google OAuth |
| Email | Resend |
| Tests | Vitest (frontend), Node test runner (backend integration) |
| Infra | Docker Compose (PostgreSQL + backend API + web), optional Caddy HTTPS proxy |
| CI | GitHub Actions (oxlint, TypeScript, builds, full test suites) |

## Project Structure

```text
ASCEND/
├── backend/          # Node.js + Express API (Prisma)
│   ├── prisma/       # Schema, migrations, seed data
│   ├── Dockerfile    # Containerized API (builds, migrates, serves)
│   └── src/          # Feature modules (auth, routine, workout, social, progress, ...)
├── web/              # React + Vite PWA
│   ├── Dockerfile    # Containerized PWA (nginx + same-origin API proxy)
│   └── nginx.conf    # SPA serving + API route proxying
├── docs/             # api.md, architecture.md, requirements.md, roadmap.md, operations.md
├── scripts/          # postgres backup/restore helpers
├── compose.yaml      # PostgreSQL + backend API + web via Docker
├── compose.caddy.yaml# optional Caddy automatic-HTTPS override
├── Caddyfile         # Caddy config (needs APP_DOMAIN for Let's Encrypt)
├── .github/          # CI workflow
├── .env.example      # Compose environment template
├── CHANGELOG.md      # Per-fase history of changes
└── README.md
```

## Getting Started

Prerequisites: Node.js 22+ (repo pins `22` via `.nvmrc` — run `nvm use`), Docker (or a PostgreSQL instance).

### Option A — Full stack in Docker

Runs PostgreSQL, the backend API (migrations applied on startup), and the
frontend (nginx serving the PWA with same-origin API proxying):

```bash
cp .env.example .env          # adjust credentials and set JWT_ACCESS_SECRET
docker compose up --build -d  # PostgreSQL :5432, API :3000, web :8080
# open http://localhost:8080
```

The web container builds a bundle that calls the API same-origin; nginx
forwards the `/auth`, `/exercises`, `/routines`, `/workouts`, `/progress`,
etc. routes to the backend. Override with `VITE_API_BASE_URL` in `.env` if you
serve the frontend and API from different hosts.

> Note: in production the API marks its auth cookies `Secure`, so serve the app
> over HTTPS (modern browsers still allow them on `http://localhost` for local
> testing).

#### Automatic HTTPS (optional, Caddy)

```bash
APP_DOMAIN=your.domain.com docker compose -f compose.yaml -f compose.caddy.yaml up -d --build
# open https://your.domain.com — Caddy issues and renews Let's Encrypt certs automatically
```

Without `APP_DOMAIN` it falls back to `https://localhost` with Caddy's internal
CA. See [`docs/operations.md`](docs/operations.md) for deployment, backups, and
CI details.

### Option B — Manual

#### 1. Database

```bash
cp .env.example .env          # adjust credentials if needed
docker compose up -d postgres # starts PostgreSQL on :5432
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # set DATABASE_URL (see below)
npm install
npx prisma migrate deploy     # apply migrations
npx prisma generate           # generate the Prisma client
npm run dev                   # API on http://localhost:3000
```

`backend/.env.example` shows the required `DATABASE_URL` and `JWT_ACCESS_SECRET`. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are optional — without them, password-reset links are logged to the console instead of emailed.

### 3. Frontend

```bash
cd web
npm install
npm run dev                   # PWA on http://localhost:5173
```

Seed data (optional): `npm run prisma:seed` in `backend/` loads the exercise catalog and routine templates.

## Testing

```bash
cd backend
npm run lint                  # oxlint
npm run typecheck
npm test                      # integration tests against the API

cd web
npm run lint                  # oxlint
npm run build                 # type check + production build
npm test                      # vitest
```

Postgres backups: `bash scripts/backup-postgres.sh` (restore: `bash scripts/restore-postgres.sh <dump>`). See [`docs/operations.md`](docs/operations.md).

## Documentation

- [`CHANGELOG.md`](CHANGELOG.md) — per-fase history of user-facing changes.
- [`docs/api.md`](docs/api.md) — full HTTP API reference.
- [`docs/architecture.md`](docs/architecture.md) — design and decisions.
- [`docs/requirements.md`](docs/requirements.md) — functional requirements.
- [`docs/roadmap.md`](docs/roadmap.md) — roadmap and scope.
- [`docs/operations.md`](docs/operations.md) — deployment, HTTPS, backups, CI.