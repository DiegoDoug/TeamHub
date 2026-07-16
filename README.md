# TrackHub

Team management for track & field programs — unified workout planning,
logging, chat, and a shared calendar, organized by event group. See
[MVP-SPEC.md](MVP-SPEC.md) for the full scope and
[PRODUCT-OVERVIEW.md](PRODUCT-OVERVIEW.md) for the product framing.

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** self-hosted Supabase (Postgres + Auth + PostgREST + Realtime),
  entirely in Docker — no external cloud project required
- **Authorization:** Postgres Row Level Security, not client-side route guards

## Running it

```bash
cp .env.example .env    # local-dev demo secrets; see the file's header comment
docker compose up -d --build
```

This brings up: Postgres, GoTrue (auth), PostgREST (rest), Realtime, Kong
(API gateway), Postgres-meta + Studio (DB admin UI), and the Next.js app.

- App: http://localhost:3000
- Supabase Studio: http://localhost:8000 (basic-auth: `trackhub` / see `.env`)
- Postgres: `localhost:54322`

First boot runs the schema + RLS migrations under `supabase/db/migrations/`
automatically (baked into the `db` image at build time — see
`supabase/db/Dockerfile`).

### Local development (faster iteration than a full image rebuild)

```bash
docker compose up -d db auth rest realtime meta studio kong
npm install
npm run dev   # reads .env.local, points at the dockerized stack on :8000
```

## Testing

```bash
npm run test:unit    # Vitest
npm run test:e2e      # Playwright, against the dockerized stack
```

## Project layout

- `app/` — Next.js routes (see MVP-SPEC.md's route map)
- `lib/supabase/` — browser/server/middleware Supabase clients
- `supabase/db/migrations/` — schema + RLS, source of truth for the data model
- `supabase/kong/` — API gateway routing
