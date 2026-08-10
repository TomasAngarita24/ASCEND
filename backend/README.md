# Backend (Node.js + Express + TypeScript)

Initial scaffold for the ASCEND backend API.

## Development Setup

1. Copy the root `.env.example` to `.env` and set a local `POSTGRES_PASSWORD`.
2. Copy `backend/.env.example` to `backend/.env` and use the same database credentials in `DATABASE_URL`.
3. Start PostgreSQL with `docker compose up -d postgres`.
4. Wait until `docker compose ps` reports the `postgres` service as healthy.
5. In `backend/`, generate the Prisma client with `npm run prisma:generate`.
6. Apply the initial database migration with `npm run prisma:migrate:dev`.
7. Populate the global exercise library with `npm run prisma:seed`.

The Prisma schema and migration history are in `prisma/`. Do not edit the database schema manually; make database changes through Prisma migrations.

## Tests

Run integration tests with:

```powershell
npm test
```

Tests require the local PostgreSQL container and `backend/.env`. They create temporary data with the `auth.automated.`, `exercise.automated.`, `routine.automated.`, and `workout.automated.` prefixes, then remove it after execution.
