# Velozity Global Solutions

A real-time client project dashboard built for the technical hiring assessment.

## Run locally

Prerequisites: Node 20+, Docker Desktop.

```bash
docker compose up -d
npm install
copy server\.env.example server\.env
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:5173. Seed users all use `password123`: `admin@velozity.dev`, `ravi@velozity.dev`, `maya@velozity.dev`, and `dev1@velozity.dev` through `dev4@velozity.dev`.

## Architecture

- **Web:** React + TypeScript + Vite. The dashboard keeps a short-lived access token in memory; the refresh token is an HttpOnly, SameSite cookie and is never exposed to JavaScript.
- **API:** Express + TypeScript. Authentication and ownership rules are applied in middleware and route handlers, so UI hiding is not a security boundary. PM queries are scoped to `project.ownerId`; developer queries are scoped to `task.developerId`.
- **Database:** PostgreSQL with Prisma. Projects, tasks, users, clients, activities, notifications, and refresh tokens have relational foreign keys. Indexes cover project ownership, developer/status, project/due date, status/priority, activity timelines, and unread notifications.
- **Realtime:** Socket.IO was chosen over native WebSocket for reliable reconnect behavior and room support. Project rooms receive status events; the server also emits presence and dashboard invalidation events. Feed history and missed events always come from PostgreSQL (the API returns the latest 20 role-filtered events).
- **Jobs:** node-cron runs hourly and marks due TODO/In Progress tasks as Overdue. This is deliberately small and transparent for a single service; Bull would be the next choice for multi-instance durable job execution.

## Schema

`User 1--N Project (owner)`, `Client 1--N Project`, `Project 1--N Task`, `User 1--N Task (developer)`, `Task 1--N Activity`, `Project 1--N Activity`, `User 1--N Notification`, and `User 1--N RefreshToken`.

## Explanation (assessment field)

The hardest part was making the activity stream useful without turning it into an untrusted frontend feature. Every status mutation passes through server-side role and ownership checks, writes a permanent Activity row in the same request, then emits that row through Socket.IO. Project rooms keep live updates focused, while the dashboard query applies the same role scope to historical events, so a reconnecting user gets database-backed catch-up rather than stale in-memory state. Developer access is constrained by task assignment in both task reads and status writes; changing a JWT payload cannot bypass those checks because the API derives scope from the database. I chose Socket.IO because its rooms, reconnect lifecycle, and client ergonomics reduce incidental realtime code compared with a native protocol. The main thing I would do differently for production is move the overdue scheduler and event fan-out behind a durable queue/Redis adapter, which would make multiple API instances safe. I would also add a dedicated audit-event service and end-to-end tests for every role matrix combination.

## Known limitations

This assessment build uses a single API instance and local Socket.IO adapter. Production deployment needs a Redis adapter for horizontal realtime scaling, managed Postgres, secret rotation, rate limiting, and automated CI migrations.
