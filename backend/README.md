# Backend (Node.js + Express + TypeScript)

Initial scaffold for the ASCEND backend API.

## Development Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the local PostgreSQL connection string.
3. Generate the Prisma client with `npm run prisma:generate`.
4. Apply the initial database migration with `npm run prisma:migrate:dev`.

The Prisma schema and migration history are in `prisma/`. Do not edit the database schema manually; make database changes through Prisma migrations.
