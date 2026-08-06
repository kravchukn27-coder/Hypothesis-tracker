# Tech Backlog

## TECH-001 — Provision a Postgres database and wire `DATABASE_URL`

**Status:** TODO
**Priority:** HIGH
**Summary:** Prisma schema exists (`prisma/schema.prisma`) but no
database is connected yet — `.env`'s `DATABASE_URL` needs a real
Postgres instance (local via `npx prisma dev`, Docker, or a hosted
free-tier Postgres) before `prisma migrate dev` can run.
