# Contributing to MockClub

Thanks for being here. This project exists because people give time they don't have to
help people they've never met — contributing code is exactly the same thing.

**Everyone is welcome**, whatever your experience level. If this would be your first
open-source contribution, say so in the issue and someone will walk you through it.

## Before you start

- **Claim the issue first.** Comment on it so two people don't build the same thing.
- **For anything non-trivial, open an issue before writing code.** A rejected PR that
  took you a weekend is a bad experience and it's on us to prevent it.
- Look for [`good first issue`](../../labels/good%20first%20issue) and
  [`help wanted`](../../labels/help%20wanted).

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

**Node 24** (see `.nvmrc`), and a MongoDB connection string (free Atlas M0 is fine).
Note that transactions need a replica set — Atlas is one, a local standalone
`mongod` is not.

Node 24 is a floor, not a preference: `npm test` runs TypeScript through Node
directly, which needs unflagged type stripping (22.18+) and `module.registerHooks`
(22.15+). On Node 20 the test step cannot parse at all. We install with **npm** —
that is what CI runs, so a pnpm or yarn lockfile will produce diffs CI can't
reproduce.

To make yourself an admin, sign in with Google once, then promote that account:

```bash
node scripts/set-role.mjs you@example.com candidate,interviewer,admin
```

Better Auth has no bootstrap admin, so this script is the only way in. It reads
`MONGODB_URI` straight out of `.env.local`.

## The rules that actually matter

These are the ones we will ask you to change in review. Everything else is negotiable.

### 1. No AI in the product

Not as an interviewer, not as a feedback generator, not as a "practice partner". This
isn't a technical preference, it's the entire point of the club. Use AI to *write* code
if you like — just don't ship it *into* the product.

### 2. No payments, ever

No Stripe, no price fields, no credit purchases, no "pro" tier, no ads, no affiliate
links. If a feature only makes sense with money attached, it doesn't belong here.

### 3. Business logic goes in `src/server/`, never in `src/app/`

`app/` may import from `server/`. **`server/` may never import from `app/` or from
`next/*`.** Keep the domain pure so it stays testable and portable.

### 4. Times: instants in UTC, rules in local time + IANA zone

Recurring availability ("Tuesdays 18:00") is a *local wall-clock intention*, not an
instant. Store `days[]` + a `"18:00"` string + an IANA zone on the schedule. Bookings
are UTC instants.

Storing a recurring rule in UTC silently shifts everyone's availability by an hour twice
a year and you cannot repair it afterwards, because the original zone is gone. Never
store offsets (`+06:00`) or abbreviations (`BST`, `IST`) — always IANA ids.

Use the wrapper in `src/lib/time`, not Luxon or `Date` directly. It exists so we can move
to `Temporal` when Safari ships it.

### 5. Booking writes must be atomic

Never `find()` then `insert()`. Claim the slot with a guarded
`findOneAndUpdate({ _id, status: "open" }, ...)` and treat a `null` result as
"slot taken" → 409. The partial unique index is the real guarantee; catch
`err.code === 11000` too.

### 6. Every user-facing string must be translatable

No hardcoded English in components. This platform is global by design and half our users
will not read English comfortably.

### 7. Don't hand-edit `src/components/ui/`

Those are shadcn primitives. Regenerate them (`npx shadcn@latest add <name>`) and wrap
them if you need different behaviour.

## Commits and PRs

- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
  `docs:`, `refactor:`, `test:`, `chore:`
- Branch from `main`: `feat/interviewer-availability`, `fix/slot-timezone-drift`
- Keep PRs small and single-purpose. A 2,000-line PR will sit unreviewed and we'll both
  be sad about it.
- Fill in the PR template — especially **how you tested it**.

Before pushing:

```bash
npm run lint
npm run build
```

## Accessibility & design

- Keyboard navigable, visible focus states, real `<label>`s on inputs.
- Respect `prefers-reduced-motion` — every animation must have an off switch.
- Don't introduce new colours or fonts. Use the tokens in `globals.css`
  (`--ink`, `--paper`, `--vermilion`) so light, dark and RTL all keep working.

## Translations

Adding your language is one of the most valuable things you can do here, and it needs no
JavaScript. Open an issue with the language name and we'll get you the string file.

## Reviews

We aim to respond within a few days. Everyone maintaining this is a volunteer with a day
job — if something goes quiet, a polite nudge on the PR is genuinely welcome, not rude.

## Licence

Contributions are licensed under [AGPL-3.0](./LICENSE), same as the project.
