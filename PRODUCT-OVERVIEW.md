# TrackHub — Product Overview

## What it is

TrackHub is a team-management platform built specifically for track & field programs. It replaces the spreadsheet + group-chat + email patchwork that most programs run on today with one system for planning workouts, logging results, communicating, and scheduling.

## Who it's for

- **Primary:** NCAA D1/D2/D3 track & field programs (~1,200 in the US)
- **Secondary:** Elite high school programs, club teams, professional training groups
- **Tertiary:** Cross country programs, structured running clubs

## Core value proposition

- One system instead of five (email, group chat, spreadsheets, a calendar app, and a results tracker)
- Workout planning that matches how programs actually think: **Cycle → Week → Day**, split by **event group** (Sprints, Distance, Jumps, Throws, Multi)
- Accountability via athlete-logged workouts tied back to the plan
- A foundation for AI-driven insights (training load, injury risk, performance trends) once there's data to analyze

## How the org is modeled

- A **team** has many **event groups**, each led by one **event coach**.
- Athletes belong to one or more event groups (e.g., a 400m runner in Sprints and the 4x400 relay).
- **Head coach** (super admin): manages the team, assigns event coaches, sees everything.
- **Event coach**: manages their own group's roster, workouts, and messaging.
- **Athlete**: sees assigned workouts, logs their own training, views their own progress.

## Monetization (from the business plan, for context — not part of the MVP build)

Tiered SaaS: Starter $99/mo, Professional $249/mo (AI analytics), Elite $499/mo (predictive AI, API access), custom Enterprise. Add-ons (video analysis, nutrition, injury tracking, parent portal) and a template marketplace are planned revenue expansions post-MVP.

## Competitive angle

General tools (TeamSnap, TeamBuildr) aren't built around event-group structure or cycle/week/day periodization. Endurance-focused tools (TrainingPeaks, Final Surge) don't model a multi-event team roster. TrackHub's bet is: be the one tool purpose-built for how T&F programs are actually organized, then layer AI analytics on top once workout/log data is flowing.
