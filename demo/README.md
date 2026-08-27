# WIP Tracker — standalone demo

A single self-contained HTML file (`wip-tracker-demo.html`) built as a fast-iteration testing
prototype, separate from the `server`/`client` scaffold in the repo root. It exists to answer a
different question than the scaffold does: not "is the architecture right," but "does this
workflow actually make sense to the people who'll use it" — something easiest to test by putting
a working tool in front of people this week, not after a backend and auth are stood up.

## What it is, and isn't

- **No server, no build step.** Open the file in a browser and it runs. All state lives in memory
  plus the browser's own `localStorage` — there is no database, no API, and nothing is shared
  between two people running it. Each person who opens it gets their own private sandbox, which is
  the point: this was handed to several people to test independently before anything is shared or
  wired up for real.
- **Not the production data model.** It intentionally diverges from `server/prisma/schema.prisma`
  in places (e.g. a company-wide action register spanning every department, not just production
  jobs; a full stage lifecycle from Order Received through Dispatch, not just task-level tracking).
  Treat it as a design exploration that validated a shape, not as the schema to build the real
  backend from verbatim — reconcile the two deliberately when work starts on the real thing rather
  than assuming this file wins.
- **BC integration is import, not live.** There's no live Business Central connection. Import reads
  a real BC "Job WIP Worksheet" export directly — `.xlsx` uploaded and parsed in-browser (a
  hand-rolled zip/XML reader, since this file can't depend on external libraries), or CSV/pasted
  cells — maps columns, and upserts jobs by job number.

## What's in it

- Company-wide action register (Safety/Quality/Production/Maintenance/Environmental/Training/Other)
  alongside production job tracking, unified under one dashboard and one register view.
- A full job stage lifecycle (Order Received → Engineering → Procurement → Materials Available →
  Production → NDT/Testing → Documentation → Ready for Dispatch → Complete) as a drag-and-drop
  Kanban board, plus the underlying task-line model (staff assignment, Welding Workshop headcount
  pools, Robotics staff+equipment with a team-leader approval workflow) once a job reaches
  Production.
- BC `.xlsx`/CSV import with column mapping, job-task-row grouping, and optional task-line seeding.
- Delegation: a team leader's actual open tasks, actions, and owned jobs move live onto whoever's
  covering for them, and back off once the delegation ends — no manual reassignment either way.
- Production forecast, due-date-change and idle-time analytics, and an in-app Getting Started guide
  for anyone testing it cold.

## Distributing it

Either send the file directly (fully offline-capable, no network needed after it's opened), or
publish it as a Claude Artifact and share that link — both keep each person's data private to their
own browser. See the in-app Getting Started guide (first thing shown on a fresh browser) for what to
tell testers.
