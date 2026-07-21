<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MockClub — project rules

Read [PLAN.md](./PLAN.md) for the full architecture and the reasoning behind these.
[CONTRIBUTING.md](./CONTRIBUTING.md) is the human-facing version of the same rules.

## Non-negotiable product constraints

- **No AI in the product.** No AI interviewers, AI feedback, or AI practice partners.
  This is the entire point of the project, not a preference.
- **No payments.** No Stripe, no price fields, no credits for sale, no premium tier,
  no ads. If a feature only works with money attached, it doesn't belong here.

## Code boundaries

- All business logic lives in `src/server/`. Routes in `src/app/` stay thin.
- `app/` may import from `server/`. **`server/` may never import from `app/` or
  `next/*`.** This keeps the domain pure, testable, and extractable later.
- Never hand-edit `src/components/ui/` — those are shadcn primitives. Regenerate
  with `npx shadcn@latest add <name>` and wrap them instead.

## Time

- Instants (bookings) → UTC.
- Recurring rules (availability) → local wall-clock `"18:00"` + `days[]` + an IANA
  zone on the schedule. **Never** store recurring rules in UTC: they silently shift
  an hour at every DST transition and cannot be repaired, because the original zone
  is gone.
- Never store offsets (`+06:00`) or abbreviations (`BST`, `IST`). IANA ids only.
- Use the wrapper in `src/lib/time`, not Luxon or `Date` directly.

## Booking writes

- Never `find()` then `insert()`. Claim with a guarded
  `findOneAndUpdate({ _id, status: "open" }, ...)`; a `null` result means 409.
- The partial unique index filtered to live statuses is the real guarantee —
  also catch `err.code === 11000`.
- Wrap claim + create in `session.withTransaction()` (it retries
  `TransientTransactionError`; the core API does not). Requires a replica set.

## i18n & a11y

- No hardcoded user-facing English. Every string must be translatable.
- RTL is enabled (Arabic, Urdu) — use logical properties, not `left`/`right`.
- Use the tokens in `globals.css` (`--ink`, `--paper`, `--vermilion`). Don't add
  new colours or fonts.
- Every animation must respect `prefers-reduced-motion`.

## Security

- Never log tokens, refresh tokens, or meeting URLs.
- Encrypt Google refresh tokens at rest. On refresh, **merge** the token object —
  Google's refresh response omits `refresh_token`, so overwriting destroys it.
- On revocation set an `invalid` flag; don't delete the credential.
