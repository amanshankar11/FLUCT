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
  
<img width="1898" height="897" alt="Screenshot (395)" src="https://github.com/user-attachments/assets/9e60bf1e-eee4-47ec-981c-a51ae2acf42f" />
<img width="1883" height="897" alt="Screenshot (396)" src="https://github.com/user-attachments/assets/2a4d7c2a-872b-4051-b983-c3fffe3a663d" />
<img width="1889" height="903" alt="Screenshot (397)" src="https://github.com/user-attachments/assets/f4ffc90d-de37-485b-9dcf-64055a684278" />
<img width="1895" height="900" alt="Screenshot (398)" src="https://github.com/user-attachments/assets/d8e14183-cdef-4d1d-8b2c-078dac4b0a48" />
<img width="1880" height="898" alt="Screenshot (399)" src="https://github.com/user-attachments/assets/2bd519e7-f815-401f-8739-8172aabc3d91" />
<img width="1889" height="900" alt="Screenshot (400)" src="https://github.com/user-attachments/assets/eb9f541c-8b22-4087-86b3-847747bbfc06" />
<img width="1894" height="897" alt="Screenshot (401)" src="https://github.com/user-attachments/assets/dd6e3ae0-462b-4afd-9f0b-a3a1242d5744" />






