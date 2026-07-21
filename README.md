<div align="center">

# MockClub

**Made by devs, for everyone.**

Free mock interviews and practice sessions with real people.
No AI. No payments. No catch — ever.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-D8452A.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-17150F.svg)](./CONTRIBUTING.md)

</div>

---

## What this is

A volunteer-run club where working professionals give an hour to practise interviews
with people trying to break in. It started as a WhatsApp group of developers who kept
seeing the same thing: good people failing interviews they were qualified for, and
nobody able to afford $150–$339/hour to practise.

**It is not a business. It never will be.** That promise is enforced by the licence
(AGPL-3.0) and by the code — there is no payment table, no Stripe integration, and no
premium tier anywhere in this repository.

### Principles

| | |
|---|---|
| 🆓 **Always free** | No card, no credits for sale, no premium tier. Ever. |
| 🧑 **Humans only** | Every session is one person talking to another. We will not add AI interviewers. |
| 🌍 **Every language** | Language is a first-class matching dimension, not an afterthought. |
| 👐 **Open source** | AGPL-3.0, so nobody — including us — can close it or sell it. |
| 🎯 **Everyone** | Engineers, founders, marketers, designers, PMs, data folks. |

## Status

**Phase 0 — pre-launch.** We are building signup and gathering interviewers.
Booking opens when there are enough volunteers to fill a calendar, and not before —
an empty booking page helps nobody.

Progress and the full technical plan live in [PLAN.md](./PLAN.md).

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | One app, one deploy |
| Language | TypeScript | — |
| Database | MongoDB | Atomic slot claims via `findOneAndUpdate` |
| Auth | Better Auth | Free RBAC, bans, rate limiting |
| UI | Tailwind v4 + shadcn/ui (radix-nova, RTL on) | RTL matters for Arabic/Urdu |
| Video | Self-hosted Jitsi (primary) + Google Meet (opportunistic) | See [PLAN.md §6](./PLAN.md) |
| Calendar | Google Calendar API | Free invites and reminders |
| Dates | Luxon behind a wrapper → Temporal later | Safari hasn't shipped Temporal |

**There is no separate backend service.** Next.js route handlers and server actions
are the backend. See [Architecture](#architecture) for why, and where the seam is if
that ever needs to change.

## Getting started

```bash
git clone https://github.com/<org>/mockclub.git
cd mockclub
npm install
cp .env.example .env.local     # fill in the values, see comments in the file
npm run dev
```

Open http://localhost:3000.

You need **Node 20+** and a **MongoDB** connection string. A free
[Atlas M0](https://www.mongodb.com/pricing) cluster is enough — and note it is a replica
set, which local standalone `mongod` is not, so transactions only work against Atlas or a
local replica set.

## Architecture

```
src/
├─ app/                  # routes only — thin. No business logic here.
│  ├─ (marketing)/       # public landing pages
│  ├─ (app)/             # authenticated product
│  ├─ (admin)/           # phase toggles, moderation queue
│  └─ api/               # webhooks, OAuth callbacks, cron
├─ components/
│  ├─ ui/                # shadcn primitives — do not hand-edit, regenerate
│  └─ */                 # our components
├─ server/               # ALL business logic lives here
│  ├─ availability/      # rules → slots. Pure functions, heavily tested.
│  ├─ booking/           # atomic claim, state machine, no-show handling
│  ├─ calendar/          # Google Calendar + ICS
│  ├─ video/             # Jitsi JWT, Meet fallback
│  ├─ config/            # platform phase + toggles
│  └─ db/                # collections, indexes, migrations
└─ lib/                  # framework-agnostic helpers (time wrapper, etc.)
```

**The rule: `app/` may import from `server/`, never the reverse.** Nothing in `server/`
may import `next/*`. That single constraint keeps the domain logic pure, trivially
testable, and extractable into a standalone service later without a rewrite.

## Contributing

We would genuinely love the help — see [CONTRIBUTING.md](./CONTRIBUTING.md).
Issues tagged [`good first issue`](../../labels/good%20first%20issue) are a good place to start.

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Please **do not** open a public issue for security problems.
See [SECURITY.md](./SECURITY.md).

## Licence

[AGPL-3.0](./LICENSE).

This is deliberate. AGPL's network clause means anyone who runs a modified version as a
public service must publish their changes. It keeps forks of this project open, and it
makes "this will never become a paid product" a legal fact rather than a promise.

If you want to run MockClub for your own community — please do. Fork it, translate it,
adapt it. That is the point.
