# TrackHub — One-Shot MVP Build Spec

This scopes a version of TrackHub buildable in a single agent coding session (hours, not months). It is a deliberate subset of the full plan in [Track _ Field Team Management SaaS - Executive Review Full.md](Track%20_%20Field%20Team%20Management%20SaaS%20-%20Executive%20Review%20Full.md) — enough to demo the core value prop (unified planning + logging + communication for a team, organized by event group) end to end, with a real Postgres schema and auth, but with every multi-month feature stripped out.

**Definition of done:** a head coach can sign up, create a team, create event groups, invite/add athletes and an event coach, build a training cycle with weeks and days, athletes can see and log their assigned workouts, everyone can chat in the team channel and their event-group channel, and there's a shared team calendar with practices/meets. All of it enforced by role-based access, not just hidden UI.

## Explicit non-goals (do not build these — flag if asked to expand scope)

- AI/ML analytics, pattern detection, injury-risk scoring, predictive models — **none of it**. No Python service, no vector DB.
- Mobile apps (React Native) — web only, responsive.
- External calendar sync (Google/Outlook), SMS (Twilio), transactional email (SendGrid) — in-app only.
- Billing/Stripe, subscription tiers, usage limits.
- Video upload/analysis, nutrition tracking, injury tracking module, parent portal.
- Workout template marketplace.
- Multi-team / conference-wide / white-label / Enterprise features.
- Drag-and-drop reordering (use simple ordered lists with up/down or a numeric order field) — nice-to-have, not MVP.

## Tech stack

Chosen for one-shot buildability and because a Supabase project is available in this environment:

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Data fetching:** TanStack Query, or plain Server Components + Server Actions — implementer's call
- **Forms/validation:** React Hook Form + Zod
- **Backend/DB/Auth/Realtime:** Supabase (Postgres, Supabase Auth, Realtime for chat, Row Level Security for all authorization)
- **Hosting:** Vercel (frontend) + Supabase project (already provisioned)
- **No separate API layer** — Supabase client from Server Actions/Route Handlers, secured by RLS. No GraphQL gateway, no Node/Express service, no Python service.

## Roles & permissions

Three roles stored on `team_members.role`: `head_coach`, `event_coach`, `athlete`.

| Action | Head Coach | Event Coach | Athlete |
|---|---|---|---|
| Manage team settings, coaches | ✅ | ❌ | ❌ |
| Create/edit event groups | ✅ | ❌ | ❌ |
| Add/remove athletes in their own group | ✅ | ✅ (own group only) | ❌ |
| Create/edit cycles, weeks, days for their group | ✅ | ✅ (own group only) | ❌ |
| View any athlete's logs on the team | ✅ | ✅ (own group only) | ❌ |
| Log own workouts | — | ✅ (if also logging personally, optional) | ✅ |
| View own assigned workouts & progress | — | — | ✅ |
| Post in team-wide channel | ✅ | ✅ | ✅ |
| Post in an event-group channel | ✅ | ✅ (own group) | ✅ (own group(s)) |
| Create calendar events | ✅ | ✅ (own group) | ❌ |

Enforce this with Postgres RLS policies keyed off `auth.uid()` joined through `team_members` — not just client-side route guards.

## Data model

```sql
-- Identity & org structure
profiles            (id uuid pk references auth.users, full_name, email, created_at)
teams               (id uuid pk, name, created_at, created_by uuid references profiles)
team_members        (id uuid pk, team_id fk, profile_id fk, role text check in
                      ('head_coach','event_coach','athlete'), created_at)
event_groups         (id uuid pk, team_id fk, name text, event_coach_id fk profiles, created_at)
event_group_members  (id uuid pk, event_group_id fk, profile_id fk, unique(event_group_id, profile_id))

-- Workout planning: Cycle -> Week -> Day
training_cycles     (id uuid pk, event_group_id fk, name, start_date, end_date, phase text, created_at)
training_weeks      (id uuid pk, cycle_id fk, week_number int, focus text, notes text)
training_days       (id uuid pk, week_id fk, day_of_week int, -- 0=Mon..6=Sun
                      warmup text, drills text, main_work text, cooldown text, notes text)

-- Logging
workout_logs        (id uuid pk, athlete_id fk profiles, training_day_id fk nullable,
                      -- nullable so athletes can log unassigned/extra workouts
                      workout_type text, data jsonb, -- shape varies by type (distance/speed/weights/technical)
                      effort_rating int check (effort_rating between 1 and 10),
                      notes text, logged_at timestamptz default now())

-- Communication
channels            (id uuid pk, team_id fk, type text check in ('team','event_group'),
                      event_group_id fk nullable, name text)
messages            (id uuid pk, channel_id fk, sender_id fk profiles, content text,
                      created_at timestamptz default now())

-- Calendar
calendar_events     (id uuid pk, team_id fk, event_group_id fk nullable, -- null = whole-team event
                      type text check in ('practice','meet','team_meeting','other'),
                      title text, description text, date date, start_time time, end_time time,
                      location text, created_by fk profiles, created_at)
```

Notes:
- `workout_logs.data` is `jsonb` to hold the differing shapes from the source doc (distance: duration/distance/pace; speed: splits/rest/volume; weights: exercises/sets/reps/weight; technical: drill quality/coach feedback) without four separate tables.
- Every table with a `team_id` or reachable-via-join-to-team_id gets an RLS policy restricting to team members; group-scoped tables additionally restrict event coaches/athletes to their own group.
- Athlete-in-multiple-groups is supported via `event_group_members` being many-to-many.

## Feature list (build in this order)

### 1. Auth & onboarding
- Sign up / log in via Supabase Auth (email+password).
- First-run flow: create a team (becomes `head_coach`) **or** join an existing team via invite (simplest: head coach adds a user by email after they've signed up — no invite-token email flow needed for MVP).
- Acceptance: a new user can end up as head coach of a team with zero other setup required.

### 2. Team & event group management (head coach)
- Create event groups (name + assign one event coach from existing team members).
- Add/remove athletes to/from a group.
- View a roster page listing all groups and their members.
- Acceptance: head coach can stand up Sprints/Distance/Jumps/Throws/Multi groups with coaches and athletes assigned.

### 3. Workout planning — Cycle → Week → Day (head coach + event coach)
- Card-based UI: Cycle list → click into a cycle to see Week cards → click into a week to see Day cards (Mon–Sun).
- Day editor: warmup / drills / main work / cooldown / notes (plain text areas, no rich text needed).
- Create/edit/delete at each level, scoped to the coach's own event group (head coach can do this for any group).
- Acceptance: an event coach can build a 4-week cycle with daily workouts without leaving the UI.

### 4. Workout logging (athlete)
- "Today" view shows the athlete's assigned workout(s) for the current day across all their groups.
- Quick-log button pre-fills from the assigned workout; athlete can also log an unassigned/extra workout from scratch.
- Log form fields vary by `workout_type` (distance / speed / weights / technical) per the jsonb shapes above, plus effort rating (1–10) and notes.
- Athlete can view their own log history (simple reverse-chronological list, no charts required for MVP).
- Acceptance: athlete sees today's plan, logs it in under 30 seconds, and can scroll back through past logs.

### 5. Chat
- Two channel types per team: one `team` channel (auto-created when team is created) and one `event_group` channel per group (auto-created when the group is created).
- Real-time messages via Supabase Realtime subscription on `messages` filtered by `channel_id`.
- Plain text messages only — no threading, reactions, attachments, or @mentions for MVP.
- Acceptance: two users in the same group see each other's messages appear live without a page refresh.

### 6. Calendar
- Team-wide calendar view (month or list view is fine) showing `calendar_events`.
- Create event: type, title, date, start/end time, location, description, optional event-group scoping.
- No recurrence engine — if a coach wants a recurring practice, they create each instance (recurrence is a documented follow-up, not MVP).
- Acceptance: head coach/event coach can add a meet and a week of practices; athletes see them read-only.

### 7. Athlete profile (minimal)
- Basic profile: name, primary events, PR list as free-text or simple key-value rows — no performance-trend charts, no PR-detection logic.
- Acceptance: exists as a page, editable by the athlete and viewable by their coaches.

## Page/route map (Next.js App Router)

```
/login, /signup
/onboarding                      -- create team or wait to be added
/dashboard                       -- role-aware home: coach sees team overview, athlete sees "Today"
/team/roster                     -- event groups + members (head coach)
/team/settings                   -- team name etc. (head coach)
/groups/[groupId]/cycles         -- cycle list for a group
/groups/[groupId]/cycles/[cycleId]           -- weeks
/groups/[groupId]/cycles/[cycleId]/weeks/[weekId]  -- days
/log                             -- athlete's today + quick-log
/log/history                     -- athlete's past logs
/chat/[channelId]
/calendar
/profile/[profileId]
```

## Out-of-scope reminders for whoever builds this

If mid-build the assistant is tempted to add AI insights, mobile, external sync, billing, or template sharing — don't. Those are Phase 2/3 in the source plan ([Track _ Field Team Management SaaS - Executive Review Full.md:870-892](Track%20_%20Field%20Team%20Management%20SaaS%20-%20Executive%20Review%20Full.md)) and are explicitly out of scope here. The `IaaS - MPR.md` infra doc's "Forward-Looking" sections (GPU nodes, vector DB, multi-region, SOC 2, etc.) are similarly post-MVP and irrelevant to this build.
