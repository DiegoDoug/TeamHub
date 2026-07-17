# TrackHub

Team management for track & field programs — unified workout planning,
logging, chat, and a shared calendar, organized by event group. See
[MVP-SPEC.md](MVP-SPEC.md) for the full scope (roles, data model, feature
list, route map) and [PRODUCT-OVERVIEW.md](PRODUCT-OVERVIEW.md) for the
product framing.

**Status:** all seven MVP features are built, tested, and verified against a
from-scratch `docker compose build` — see [Definition of done](#definition-of-done).

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** self-hosted Supabase (Postgres + Auth + PostgREST + Realtime),
  entirely in Docker — no external cloud project required
- **Authorization:** Postgres Row Level Security everywhere, not client-side
  route guards — every table's access rules live in
  `supabase/db/migrations/102_rls_policies.sql` and are enforced by Postgres
  itself, regardless of what the UI does or doesn't show

## Running it

```bash
cp .env.example .env    # local-dev demo secrets; see the file's header comment
docker compose up -d --build
npm install              # only needed on the host for the seed script/tests below
npm run seed              # optional: populates a demo team so there's something to look at
```

This brings up: Postgres, GoTrue (auth), PostgREST (rest), Realtime, Kong
(API gateway), Postgres-meta + Studio (DB admin UI), and the Next.js app —
seven containers, `docker compose ps` should show all of them healthy within
about a minute.

- App: http://localhost:3000
- Supabase Studio (DB admin UI): http://localhost:8000 — basic-auth
  `trackhub` / see `DASHBOARD_PASSWORD` in `.env`
- Postgres (for direct `psql` access): `localhost:54322`

First boot runs the schema + RLS migrations under `supabase/db/migrations/`
automatically (baked into the `db` image at build time — see
`supabase/db/Dockerfile`; the migrations are `COPY`'d in rather than bind
-mounted specifically so a fresh clone reproduces the exact same schema
every time).

If you ran `npm run seed`, sign in at http://localhost:3000/login with any
of (password `demo-password-123`):

| Role | Email |
|---|---|
| Head coach | `coach.head@demo.trackhub.local` |
| Event coach | `coach.sprints@demo.trackhub.local` |
| Athlete | `athlete.one@demo.trackhub.local` |
| Athlete | `athlete.two@demo.trackhub.local` |

### Local development (faster iteration than a full image rebuild)

```bash
docker compose up -d db auth rest realtime meta studio kong   # everything except web
npm install
npm run dev   # reads .env.local, points at the dockerized stack on :8000
```

## Testing

```bash
npm run test:unit    # 39 Vitest tests — real signups + RLS-filtered REST calls per role
npm run test:e2e      # 9 Playwright tests — full browser flows per feature's acceptance criteria
```

Both suites hit the live dockerized stack (no mocking) — `db`, `auth`, and
`rest` must be up first (`docker compose up -d db auth rest`). `test:e2e`
reuses an already-running app on :3000 if there is one, otherwise starts
`npm run dev` itself.

## Definition of done

Per MVP-SPEC.md: *"a head coach can sign up, create a team, create event
groups, invite/add athletes and an event coach, build a training cycle with
weeks and days, athletes can see and log their assigned workouts, everyone
can chat in the team channel and their event-group channel, and there's a
shared team calendar with practices/meets — all enforced by role-based
access, not just hidden UI."* Every clause of that has a passing e2e test
exercising it through the real UI, and the RLS suite separately confirms the
role-based enforcement holds at the database layer even if a client ignored
the UI entirely (tries to write data a role shouldn't be able to, tries to
read another team's data, tries to escalate its own role).

## Project layout

- `app/` — Next.js routes (see MVP-SPEC.md's route map)
- `lib/supabase/` — browser/server/middleware Supabase clients. Note
  `server.ts`/`middleware.ts` prefer `SUPABASE_URL` (the Docker-internal
  `http://kong:8000`) over `NEXT_PUBLIC_SUPABASE_URL` (the browser-facing
  `http://localhost:8000`) when running inside the `web` container — see the
  comments in `lib/supabase/cookie-name.ts` for why both clients also need
  to agree on an explicit session-cookie name.
- `lib/actions/`, `lib/validation/` — Server Actions and Zod schemas, one
  file per feature area
- `supabase/db/migrations/` — schema + RLS, source of truth for the data model
- `supabase/kong/` — API gateway routing
- `scripts/seed.ts` — idempotent demo-data seed (`npm run seed`)
- `tests/integration/` — RLS tests against the real REST API
- `tests/e2e/` — Playwright tests against the real UI

## Known non-goals (by design, per MVP-SPEC.md)

AI/ML analytics, mobile apps, external calendar/SMS/email sync, billing,
video/nutrition/injury tracking, a template marketplace, drag-and-drop
reordering. See MVP-SPEC.md's "Explicit non-goals" section — these are
deliberately out of scope, not overlooked.
