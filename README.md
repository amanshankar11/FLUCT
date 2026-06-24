# FLUCT

An API monitoring and incident platform that runs scheduled HTTP checks, stores latency history, opens and resolves incidents, and sends outage/recovery email alerts.

## Architecture

- `apps/api`: Express REST API
- `apps/worker`: BullMQ worker that performs checks
- `apps/web`: React dashboard
- `packages/core`: shared monitoring and incident logic
- PostgreSQL: monitors, checks, and incidents
- Redis: repeatable jobs and the worker queue

## Local setup

1. Create the isolated database and Redis service with `docker compose up -d`.
   If using an existing PostgreSQL installation instead, run `infra/create-database.sql`
   while connected to `postgres`, then run `infra/schema.sql` against `pulsewatch`.
2. Copy `.env.example` to `.env` and adjust connection details.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open http://localhost:5173.

Email is optional. Without SMTP settings, alert messages are logged by the worker.

## API

- `GET /health`
- `GET /api/dashboard`
- `GET /api/monitors`
- `POST /api/monitors`
- `PATCH /api/monitors/:id`
- `DELETE /api/monitors/:id`
- `GET /api/monitors/:id/checks`
- `GET /api/incidents`
