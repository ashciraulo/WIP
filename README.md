# WIP Tracker

An internal work-in-progress tracking tool: jobs come in (from Business Central, or entered
manually), get broken into task lines assigned to staff, and progress from there — completion %,
expected completion dates, and handoffs between people — is visible without staff needing to fill
in much beyond what the job already requires them to know.

The guiding constraint on every design decision here: **staff should spend their time doing the
work, not reporting on it.** Updating status is a slider drag or a couple of clicks, never a form.

## What's built

**Data model** (`server/prisma/schema.prisma`)
- `User` (staff/manager/admin, with a manager relation for team rollups)
- `Job` (imported from BC via `bcJobId`, or created manually)
- `Task` — a line item on a job, ordered by `sequence`, assigned to one person, carrying
  `completionPercent`, `status`, and `expectedCompletionDate`
- `DueDateChangeLog` — every time an expected date moves, who moved it, old/new date, and a
  required reason code (material delay, staff absence, rework, client delay, scope change,
  waiting on third party, other) plus an optional free-text note
- `TaskEvent` — lightweight audit trail (assigned, started, completed, percent updated, due date
  changed) backing activity history and future reporting
- `IdleGap` — opened automatically when a task completes and the next task in sequence hasn't
  started yet; closed when it does. This is how "the job sat with nobody on it for 3 days" gets
  captured without anyone having to log it by hand.

**API** (`server/src/routes`) — Express + Prisma, see route files for the full surface:
- `auth` — dev/demo login by email (see note below)
- `jobs` — list (feeds the WIP meeting view) + detail (feeds the job modal) + create/update
- `tasks` — add task lines, update completion % (`PATCH /tasks/:id/percent`), mark
  complete/reopen, reassign, change due date with reason (`POST /tasks/:id/due-date`)
- `dashboard` — `/me` (my open tasks + jobs about to hand over to me) and `/manager` (rollup per
  direct report)
- `analytics` — due-date-change reasons over time, idle-gap durations
- `bc` — `POST /bc/import-jobs`, upserts jobs from Business Central by `bcJobId` (see below)

**Frontend** (`client/src`) — React + Vite + Tailwind, four views:
- **My Dashboard** — "My Actions" (everything assigned to me, with the completion slider right on
  the card) and "Coming To You Next" (jobs where the current task belongs to someone else but the
  *next* task is mine, with their expected handover date and a risk badge)
- **Manager View** — one row per direct report with open/overdue/at-risk counts, expandable to
  their task list; a manager scans this for who's overloaded or falling behind, not to micromanage
  every line
- **WIP Meeting** — every active job, soonest due date first, current task + assignee visible
  without opening anything; left-edge color flags jobs nearing (amber, ≤7 days) or past (red) their
  due date; clicking a row opens the job modal with every task line and full history
- **Analytics** — due-date-change reasons (bar breakdown + by staff member) and idle-gap report
- **Job modal** — click a due date anywhere to edit it inline: date picker + required reason +
  optional note, `Save` or clicking outside the modal both commit and close

### Risk flagging (`server/src/services/scheduleRisk.ts`)
A task is flagged `OVERDUE` if today is past its expected date, or `AT_RISK` if a straight-line
projection of pace-so-far (elapsed time since start vs. % complete) suggests it won't hit the
expected date even though that date hasn't arrived yet. Deliberately simple linear extrapolation —
predictable to read, no hidden model. This is what drives the risk badges/dots across every
dashboard and needs zero extra input from users.

## Additional features included beyond the original ask

- **Idle-gap tracking** is automatic (see `IdleGap` above) — nobody logs "this sat waiting", it's
  derived from task status transitions that already happen.
- **Reopen a task** that was marked complete by mistake, without losing its history.
- **Push vs. pull analytics** — the due-date report splits changes into "pushed later" vs. "pulled
  earlier" so a manager can see whether estimates are trending optimistic or pessimistic, not just
  that they're changing.
- **Original vs. current expected date** kept on every task, so slippage over a task's life is
  visible even between change-log entries.
- **Manager scoping via `managerId`** so `/dashboard/manager` only ever shows a manager their own
  reports — this generalizes cleanly if the org chart gets deeper (skip-level rollups) later.

## Suggested next features (not built yet)
- **Notifications**: a daily digest (email/Teams) of what's overdue or handing over today, so the
  dashboard isn't the only place this surfaces — reduces the need to remember to check it.
- **BC write-back**: once a job's tasks are all complete, optionally post a status/% back to BC so
  the two systems don't diverge.
- **SSO**: replace the dev email-login with the company's real identity provider (see note below)
  before this touches real data.
- **Capacity view**: alongside open-task counts, a rough hours-remaining estimate per person (task
  count alone doesn't distinguish a 20-minute task from a two-week one).
- **Comments/mentions on a task**, for the handful of times a quick note ("waiting on you to check
  X") is genuinely useful — kept optional so it doesn't become another data-entry chore.
- **Mobile-friendly view** of "My Actions" specifically, since that's the screen staff will open
  most, often not at a desk.

## Getting started

```bash
npm install

cp server/.env.example server/.env
npm run db:migrate     # creates the SQLite dev DB and applies the schema
npm run db:seed        # loads demo users, jobs, tasks, due-date history, an idle gap

npm run dev:server     # API on :4000
npm run dev:client     # app on :5173 (proxies /api to :4000)
```

Sign in with any seeded email — no password in dev mode:
- `priya@example.com` — manager (see Manager View + everyone's dashboards)
- `alex@example.com`, `jordan@example.com`, `sam@example.com` — staff

## Auth note

Login is currently "type a known email, get a session" — deliberately minimal so the rest of the
app could be built and demoed without standing up real SSO first. **This must be replaced before
the tool holds real client/job data** — swap `server/src/routes/auth.ts` for the company's actual
identity provider (Entra ID / Google Workspace) and keep `signToken()` as the only thing that
issues a session either way.

## Business Central integration

`server/src/services/bcClient.ts` is the single integration point. Until BC tenant credentials
(`BC_TENANT_ID`, `BC_CLIENT_ID`, `BC_CLIENT_SECRET`, `BC_ENVIRONMENT`, `BC_COMPANY_ID` in
`server/.env`) are supplied, it reads a local fixture (`bcFixture.json`) so job import, the
dedupe-by-`bcJobId` upsert logic, and everything downstream can be built and demoed without a live
BC connection. The comments in that file lay out the real OAuth2 client-credentials + BC API v2.0
call to wire in once credentials are available — swapping it in shouldn't require touching anything
else, since `POST /api/bc/import-jobs` only depends on `fetchJobsFromBC()`'s return shape.

## Database

SQLite for zero-config local dev. Nothing in the schema is SQLite-specific — switching
`server/prisma/schema.prisma`'s datasource to `postgresql` and pointing `DATABASE_URL` at a real
Postgres instance is the only change needed for a shared/production environment.
