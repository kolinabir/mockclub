# Community Practice Platform — Master Plan

**Model:** Free forever. Real humans only, no AI. Global, all major languages. All roles
(dev, founder, marketer, designer, PM, data, sales). Volunteers give time; nobody pays, ever.

**Launch strategy:** Sequenced. Schema is global from day one; *access* opens in phases
controlled from the admin panel.

---

## 1. Phased launch (admin-controlled, not code-controlled)

The whole point: **you flip phases from a dashboard, not a deploy.**

```
PHASE 0  SIGNUP_ONLY      Anyone can register. Profiles, tracks, languages, timezone.
                          No booking UI at all. "We're gathering interviewers" banner.

PHASE 1  INTERVIEWER_ONB  Interviewer applications open. Moderator queue.
                          Volunteers set availability. Still no candidate booking.

PHASE 2  SOFT_LAUNCH      Booking ON, but gated: invite-only / single track /
                          daily booking cap. Test the full loop end to end.

PHASE 3  OPEN             Booking open to all approved tracks.

PHASE X  PAUSED           Kill switch. Existing bookings honored, new bookings blocked,
                          custom message shown. Use when volunteer supply dries up.
```

Phase is a single document in Mongo, cached in memory with a short TTL. Every
booking-write path re-checks it server-side — never trust the client's cached phase.

### Global toggles (admin panel)

| Toggle | Effect |
|---|---|
| `phase` | The state machine above |
| `bookingEnabled` | Master booking kill switch, independent of phase |
| `signupEnabled` | Close registration if you get flooded |
| `interviewerApplicationsOpen` | Throttle supply-side intake |
| `enabledTracks[]` | Which tracks are live (`swe`, `pm`, `marketing`, ...) |
| `enabledLanguages[]` | Which interview languages are bookable |
| `maxBookingsPerCandidatePerWeek` | Demand throttle (default 1) |
| `minimumNoticeHours` | Default 24–48 |
| `rollingWindowDays` | How far ahead you can book (default 30) |
| `announcementBanner` | Free-text + severity, shown site-wide |
| `waitlistEnabled` | When booking is off, collect intent instead |

**Design rule:** every toggle has a matching *user-facing message* field. A disabled
feature must always explain itself and offer the waitlist, or people leave and never return.

---

## 2. Roles

| Role | Can |
|---|---|
| `candidate` | Book sessions, receive feedback, leave reviews |
| `interviewer` | Set availability, accept/decline, submit rubric feedback |
| `moderator` | Approve interviewer applications, resolve no-show disputes, handle reports |
| `admin` | All toggles, phase control, user bans, analytics, impersonation |

A user can hold **multiple roles simultaneously** — a senior dev is both. Store as an array,
not a single enum. This matters: your best candidates become your next interviewers, and
that flywheel is how a volunteer platform survives.

**Auth: Better Auth** (MIT, self-hosted, $0 forever).
- Clerk's free tier gates exactly what you need: **bans are Pro-only, custom roles cost $100/mo**.
- Auth.js/NextAuth v5 is still beta after ~2 years and its maintainers now point new projects
  at Better Auth.
- Better Auth gives you free: admin plugin RBAC, `banUser(id, reason, banExpiresIn)`,
  impersonation (for support), and DB-backed rate limiting.
- ⚠️ Its 2026 changelog is heavy on authorization-bypass and SSRF fixes. Pin exact versions,
  subscribe to GitHub security advisories, budget a monthly patch bump.

**Keep sign-in scopes minimal** (`openid email profile`). Run "Connect your calendar"
(the sensitive `calendar` scope) as a **separate, explicitly-consented flow later**.
Bundling it into signup tanks conversion and complicates Google OAuth verification.

---

## 3. MongoDB data model

> ### ⚠️ The one thing you lose by choosing MongoDB
>
> Postgres has `EXCLUDE USING gist` — a storage-engine-level guarantee that two bookings
> for the same interviewer can never overlap, safe under any concurrency, with zero locks.
> **MongoDB has no equivalent.** There is no range-overlap constraint.
>
> Cal.com prevents double-booking in *application code only*, and that is a genuine
> TOCTOU race — two candidates hitting "book" on the same slot within the same
> millisecond both pass the check, both insert.
>
> **The MongoDB-native fix: materialize slots as documents and book by atomic claim.**

### Collections

```js
// users
{ _id, email, name, avatarUrl,
  roles: ["candidate","interviewer"],
  timeZone: "Asia/Dhaka",              // IANA id, NEVER "BST" or "+06:00"
  languages: ["bn","en"],              // spoken, for matching
  tracks: ["swe"], seniority: "mid",
  employerDomainVerified: true,
  status: "active" | "banned" | "on_break",
  stats: { given: 24, taken: 3, noShows: 0, avgRating: 4.8 } }

// schedules — timezone lives HERE, not per-rule
{ _id, userId, name: "Default", timeZone: "Asia/Dhaka", isDefault: true }

// availabilityRules — recurring rules AND date overrides in one collection
{ _id, scheduleId, userId,
  days: [2,4],            // 0=Sun..6=Sat, LOCAL days. Present => recurring
  startTime: "18:00",     // LOCAL wall clock as a plain string. NOT a Date.
  endTime:   "20:00",
  date: null }            // non-null (e.g. "2026-08-14") => one-off override for that day

// slots — MATERIALIZED. This is the concurrency guarantee.
{ _id, interviewerId,
  startsAt: ISODate,      // UTC instant
  endsAt:   ISODate,
  status: "open" | "held" | "booked" | "cancelled" | "expired",
  heldUntil: ISODate,     // TTL for the 10-min hold while candidate fills the form
  bookingId: null,
  track: "swe", languages: ["bn","en"] }

// bookings
{ _id, slotId, interviewerId, candidateId,
  startsAt, endsAt,
  bookerTimeZone: "Europe/Berlin",   // for rendering emails/ICS later
  status: "pending"|"confirmed"|"in_progress"|"completed"
        |"cancelled_by_candidate"|"cancelled_by_interviewer"
        |"rejected"|"expired"|"no_show_candidate"|"no_show_interviewer",
  rescheduledFromId: null,
  googleEventId, meetUrl,
  attendedCandidate: null, attendedInterviewer: null }  // marked independently

// bookingEvents — append-only audit log
{ _id, bookingId, fromStatus, toStatus, actorId, reason, createdAt }

// feedback — the actual product
{ _id, bookingId, interviewerId, candidateId,
  rubric: { problemSolving:4, communication:3, codeQuality:4, ... },
  strengths: "...", improvements: "...", wouldPass: true,
  visibility: "candidate_only" }

// platformConfig — single doc, the admin panel writes here
{ _id: "singleton", phase, bookingEnabled, enabledTracks, ... }
```

### Preventing double-booking in MongoDB

**Booking is an atomic claim on an existing slot document, not an insert:**

```js
const claimed = await slots.findOneAndUpdate(
  { _id: slotId, status: "open" },              // guard is IN the query
  { $set: { status: "held",
            heldUntil: new Date(Date.now() + 10*60*1000) } },
  { returnDocument: "after" }
);
if (!claimed) throw new SlotTakenError();       // someone won the race
```

`findOneAndUpdate` is atomic on a single document. The loser gets `null` and a clean
"that slot was just taken" — no transaction, no lock, no race.

**Validated against OSS + MongoDB docs — four layers, and almost nobody does all four:**

1. **Partial unique index is the only hard guarantee.** Per the docs, "if you specify both
   the `partialFilterExpression` and a unique constraint, the unique constraint only applies
   to the documents that meet the filter expression" — so filter to live statuses and
   cancelled bookings stop blocking the slot:
   ```js
   { interviewerId: 1, startsAt: 1 },
   { unique: true, partialFilterExpression: { status: { $in: ["pending","confirmed"] } } }
   ```
   Common mistake seen in the wild: also putting `status` in the index *key*, which silently
   weakens the constraint. Note too that `upsert` **alone does not prevent duplicates** — the
   unique index is what makes it safe, so you must still catch `err.code === 11000`.
2. **Atomic claim** as above → `null` means 409.
3. **Add a lease** (`claimedUntil`) so abandoned claims self-heal. Nearly every OSS booking
   repo omits this; the best reference is `agenda/agenda` (MIT, 9.7k★), whose
   `getNextJobToRun()` is structurally an identical claim with a lease *and* a deterministic
   `sort` so contenders queue predictably.
4. **Wrap claim + booking-create in `session.withTransaction()`** — not hand-rolled
   `startTransaction/commit/abort`. The docs are explicit: "the callback API incorporates
   retry logic for `TransientTransactionError`. The core transaction API does not."
   ⚠️ Transactions **require a replica set** — Atlas M0 is one, a standalone local mongod is
   not. Without the transaction, a crash between claim and create permanently orphans the
   slot; that exact bug is present in essentially every OSS booking repo surveyed.

For reference: **Cal.com has no atomic guard at all** — read-check-then-insert, no unique
constraint on `(userId, startTime)`, only an advisory TTL hold keyed on a browser cookie.
Easy!Appointments is the same. Don't take either as the reference here; MongoDB's
`findOneAndUpdate` gives you a genuinely better primitive than what they built.

Belt and braces:
- **Unique compound index** `{ interviewerId: 1, startsAt: 1 }` — makes duplicate slot
  documents impossible even if slot generation runs twice.
- **Unique sparse index on `bookings.slotId`** — one booking per slot, enforced by the engine.
- **TTL index on `slots.heldUntil`** — abandoned holds auto-release. (Or sweep in the
  nightly cron; TTL monitor runs ~every 60s, which is fine here.)
- Candidate-side: unique index on `{ candidateId, startsAt }` in bookings, filtered to
  active statuses, so a candidate can't double-book themselves across two interviewers.

**The tradeoff, stated plainly:** materialized slots mean a combinatorial collection
(200 interviewers × 30 days × 16 slots ≈ 96k docs) that must be regenerated whenever
anyone edits availability, and extended nightly by cron. On Postgres I'd have said
"compute on the fly, never materialize." **On MongoDB, materializing is what buys you the
atomicity**, so the tradeoff is worth it — but budget real effort for the regeneration job
and its idempotency.

### Indexes

```js
slots:    { interviewerId:1, startsAt:1 }               // unique
          { status:1, startsAt:1, track:1, languages:1 } // the search query
          { heldUntil:1 }                                // TTL, expireAfterSeconds:0
bookings: { slotId:1 }                                   // unique sparse
          { interviewerId:1, status:1, startsAt:1 }
          { candidateId:1, status:1, startsAt:1 }
          { status:1, startsAt:1 }                       // cron sweeps
users:    { email:1 } unique
          { roles:1, tracks:1, languages:1, status:1 }   // interviewer discovery
```

**Hosting:** MongoDB Atlas **M0 free tier** — 512 MB, shared. Watch the storage ceiling;
96k slot docs + bookings + audit log will consume it faster than you expect. Prune
`expired`/`cancelled` slots aggressively in the nightly job.

---

## 4. Timezone rules (non-negotiable — you are global now)

**Store instants in UTC. Store rules in local time + IANA zone.**

If you store "every Tuesday 18:00" as UTC, it silently shifts by an hour twice a year for
every interviewer in a DST zone. They show as available at 5pm one week and 6pm the next,
and you get no-shows you cannot debug. You also can't repair it, because you threw away
the zone. `tzdata` ships 3–10 releases a year and governments change DST with weeks of
notice (Chile, Iran, Mexico, Lebanon all did recently).

- Availability rule → `days[]` + `"18:00"` string + IANA zone **on the schedule**
- Booking → UTC `ISODate` + a denormalized `bookerTimeZone` for rendering
- Never store offsets. Validate zone ids against `Intl.supportedValuesOf('timeZone')`
- Client sends `Intl.DateTimeFormat().resolvedOptions().timeZone`; let the user override
- **Library:** Luxon today, behind a thin internal wrapper. Temporal hit TC39 Stage 4 in
  March 2026 and is in ES2026, but **Safari stable hasn't shipped it** and Node needs the
  ~100 KB polyfill. Wrap your date logic so you can swap in ~12 months without touching
  call sites. Not `date-fns-tz` (offset-based, awkward at DST). Never Moment.

---

## 5. Booking lifecycle

```
requested ──accept──> confirmed ──> in_progress ──> completed
    │                    │  │                    ├─> no_show_candidate
    │                    │  └─reschedule─> NEW ROW (rescheduledFromId)
    │                    └─cancel─> cancelled_by_{candidate|interviewer}
    ├─decline─> rejected
    └─(48h no action)─> expired
```

- **Reschedule creates a new document**, never mutates. Preserves audit trail and releases
  the old slot cleanly.
- **Both parties mark attendance independently** (`attendedCandidate`, `attendedInterviewer`).
  Agreement auto-resolves. Disagreement → moderation queue. **Never let one party
  unilaterally strike the other.**
- Statuses that hold a slot: `pending`, `confirmed`, `in_progress`.
- Drive `in_progress` / `expired` / auto-no-show from the nightly cron, not lazily on read.

---

## 6. Video + calendar — where "free forever" actually comes from

> ### 🔴 REVISED after reading Google's docs + ~10 OSS implementations
>
> **Do not make Google Meet the critical path.** Evidence:
>
> - The only conference type Google ever documented as *"for consumers"* is
>   `eventHangout`, and it is **deprecated — "new conferences cannot be created."**
>   Consumer accounts must therefore use `hangoutsMeet`, which Google has **never
>   documented as consumer-supported.** It usually works. It is not guaranteed.
> - Real, open bugs: `Invalid conference type value` on both types
>   (google-api-nodejs-client #2387, #3197, #3234), and #3052 where event creation only
>   succeeded by *dropping* `conferenceDataVersion: 1` — i.e. no Meet link.
> - Cal.com has a first-class "insert succeeded but there is no `hangoutLink`" failure
>   branch. Somebody wrote that because it happens in production.
> - `calendar` / `calendar.events` are **restricted** scopes → Google OAuth verification
>   before you pass 100 test users. Heavy gate for a critical path.
> - The Meet REST API (`spaces.create`) is **Workspace-only** — not an option.
>
> **Revised architecture: self-hosted Jitsi is primary, Meet is opportunistic.**
>
> 1. **Primary link = Jitsi, room name = a v4 UUID.** Zero network calls (sign the JWT
>    locally), zero OAuth burden, proper moderator/participant split via the
>    `context.user.moderator` claim; the `room` + `sub` claims stop a stolen token
>    allocating other rooms.
>    ⚠️ Use a **UUID, not** Jitsi's word-based `roomNameGenerator` — that generator is
>    `Math.random()`-based (~40 bits), and Jitsi's own `isInsecureRoomName()` flags
>    word-names as insecure while whitelisting UUIDs.
> 2. **Attach it to Google Calendar as `conferenceSolution.key.type: "addOn"`** with your
>    own `entryPoints`. It renders as a first-class "Join" button in Google Calendar — you
>    keep invites, reminders and free/busy without depending on Meet.
> 3. **Offer native Meet only when known to work** — at calendar-connect time call
>    `calendarList.get` and check `conferenceProperties.allowedConferenceSolutionTypes`
>    includes `hangoutsMeet`. Cache per user. You then learn an interviewer can't host Meet
>    *when they onboard*, not when a nervous candidate stares at a dead link.
>
> Cost: ~$12–25/mo for a small Jitsi VPS. Worth it — a broken link wastes a volunteer
> hour, the one resource you cannot buy more of.
>
> ### 📌 Decision: platform-owned Meet links are DEFERRED, not rejected
>
> The eventual target is **platform-owned Meet links** — our backend creates the event
> and the Meet URL itself, so interviewers never connect a Google account at all. That
> deletes the entire OAuth token lifecycle (encryption, refresh-merge, revocation
> repair), which is the biggest source of ongoing breakage in the interviewer-OAuth model.
>
> It requires a **Google Workspace seat** (~$7/user/mo annual, $8.40 monthly — one seat
> total, not one per interviewer) plus a service account with domain-wide delegation.
> A service account *cannot* create Meet links without it; there is no consumer path.
> Later, [Google for Nonprofits](https://www.google.com/nonprofits/) makes that seat free.
>
> **Not doing this yet.** Build on Jitsi first. When we pick it up:
> 1. Buy the domain (needed for Workspace *and* for Resend anyway).
> 2. Start the **14-day Workspace trial** and run `test-meet-platform.mjs` **before paying**
>    — there is a known report (google-api-nodejs-client #3052) of Business Starter + DWD
>    returning `Invalid conference type value`, so verify rather than assume.
> 3. Admin console → Meet safety settings → allow guests to join **without a host present**.
>    Our platform user is the organizer but never joins, so without this external guests
>    knock at an empty room forever.
>
> Headroom once enabled: the binding limit is **10,000 external invitations/day** (2 per
> booking → ~5,000 bookings/day). At a target of ~400 sessions/month that is 0.3% of the
> ceiling. Watch instead for burst throttling on rapid writes to a single calendar —
> serialize and back off on `403 rateLimitExceeded`.
>
> **Verified mechanics if you do create Meet links:** `conferenceDataVersion=1` is a
> **query param, not a body field**. Use a **per-booking `requestId`** (Cal.com uses a
> constant hash — don't copy that); reusing an id is idempotent, so it makes timeout
> retries safe. Read `hangoutLink` off the insert response; if `status.statusCode` is
> `pending`, re-`GET` once before failing. **No OSS implementation polls** — treat
> `pending` as rare. Note n8n sends `conferenceSolution` where the API expects
> `conferenceSolutionKey`; that's a bug, don't copy it.

**Google Meet via the Google Calendar API is the only unmetered free option.**

```js
events.insert({
  conferenceDataVersion: 1,          // MANDATORY — omit it and the link silently vanishes
  sendUpdates: "all",
  requestBody: {
    attendees: [{email: candidate}, {email: interviewer}],
    guestsCanInviteOthers: false,    // default is true — turn OFF for interviews
    conferenceData: { createRequest: {
      requestId: crypto.randomUUID(),
      conferenceSolutionKey: { type: "hangoutsMeet" } } },
    reminders: { useDefault: false, overrides: [
      { method: "email", minutes: 1440 },
      { method: "popup", minutes: 30 },
      { method: "popup", minutes: 10 } ] }   // max 5 overrides
  }
})
```

**Google sends the invite, updates, cancellation, and both reminders — free, per attendee,
from their infrastructure.** That kills ~4 of the 5 emails per booking and removes your
need for a reminder cron entirely.

### Gotchas that will each cost you a day

1. **Meet link creation is async.** The insert response often returns
   `conferenceData.createRequest.status.statusCode === "pending"`. You must re-`GET` the
   event to read `hangoutLink`. This is the #1 integration bug.
2. **A service account cannot create Meet links** without Workspace domain-wide delegation.
   At $0 you must hold an **interviewer's** OAuth token and create the event on their calendar.
3. **Free Meet is 24h for 1:1 but drops to 60 min the moment a 3rd participant joins.**
   Shadow/observer interviewers silently break sessions.
4. **Never store the Meet URL as your only handle.** Store `googleEventId` too — if the
   interviewer revokes OAuth, the event survives but you lose the ability to update/cancel.
5. The `calendar` scope is **sensitive** → Google OAuth verification required (demo video +
   justification, ~10 days) to exit the 100-test-user cap. It is *not* restricted, so **no
   paid third-party security assessment.** Start this early; it gates your launch.

Use `freeBusy` (not `events.list`) for external conflict checks — returns only
`{start, end}`, no titles. Privacy-minimal and much easier to justify in OAuth review.

**Fallback for non-Google users:** self-hosted Jitsi (~$12–25/mo VPS, generate a random
room URL, no API call) + ICS attachments via `ical-generator` with `METHOD:REQUEST`,
stable `UID`, incrementing `SEQUENCE`. Skip CalDAV — it needs app-specific passwords,
which is bad UX and worse security posture for a volunteer platform.

---

## 7. Stack

| Layer | Pick | Why |
|---|---|---|
| App | Next.js (App Router) | — |
| DB | **MongoDB Atlas M0** (free) | Your call. See §3 for the concurrency consequence |
| Auth | **Better Auth** + admin plugin | Bans, roles, impersonation, rate limiting all free |
| Video | **Google Meet via Calendar API** | Only unmetered free option |
| Calendar UI | **Schedule-X** (MIT, React wrapper, i18n + dark mode) | FullCalendar's good views are commercial |
| Dates | Luxon behind a wrapper → Temporal later | Safari hasn't shipped Temporal |
| Email | **Resend free** (Brevo fallback) | 100/day suffices once Google carries reminders |
| Hosting | **Cloudflare Workers + Atlas**, or Vercel Hobby | See warning below |
| CAPTCHA | **Cloudflare Turnstile** (free, unlimited) | reCAPTCHA errors out past 10k/mo; hCaptcha monetizes your users |
| Errors | Sentry free (5k events) | — |

### ✅ Deploying to a VPS — this removes most of the constraints below

Self-hosting on a VPS makes a lot of earlier worry moot. What changes:

| Constraint | On Vercel/serverless | On a VPS |
|---|---|---|
| Cron frequency | Hobby = **once per day**, more frequent fails at deploy | Real crontab / systemd timers, any interval |
| Commercial-use clause | Hobby is contractually non-commercial | None |
| GitHub org repos | Hobby can't connect them | None |
| Long-running work | 60s function cap | Unlimited — run a proper worker process |
| Jitsi | Separate box needed | **Same box**, or a second small one |
| MongoDB | Atlas M0, 512 MB ceiling | Self-hosted, disk-limited |
| Cost | $0 → $20+ | **~$12–24/mo all-in** |

**Sizing:** 4 vCPU / 8 GB is comfortable for the app + MongoDB + Jitsi together
(Hetzner CPX31 ≈ €13/mo, DigitalOcean ≈ $24/mo). Jitsi is the RAM-hungry part; 2-person
rooms are cheap, so this holds well past your first few hundred sessions.

**MongoDB on a VPS — one critical detail:** transactions require a replica set, and a
default `mongod` install is a standalone. Run a **single-node replica set** instead
(`replication.replSetName` in `mongod.conf`, then `rs.initiate()` once). Same resource
cost, and `session.withTransaction()` works. Skip this and your booking transactions
silently fail in production.

**Run it as:** Docker Compose (app + mongo + caddy) with Caddy terminating TLS and
auto-renewing Let's Encrypt. Keep Jitsi's own install script separate — don't try to
Compose it into the same stack.

**Non-negotiables on a self-hosted box:** automated `mongodump` to off-box storage
(Backblaze B2 is pennies), `ufw` limited to 22/80/443 + Jitsi's UDP 10000, unattended
security upgrades, and fail2ban on SSH. You now own the uptime and the backups —
that's the real cost of a VPS, not the €13.

### ⚠️ Two hosting landmines (serverless only — ignore if you're on a VPS)

- **Vercel Hobby crons run at most once per day**, and a more frequent expression *fails at
  deploy time*. Since Google carries your reminders, your only real job is a nightly sweep —
  so this works. But know it going in.
- **Vercel Hobby is contractually non-commercial** and **cannot connect to
  GitHub-organization-owned repos** (personal only) — which bites open-source community
  projects immediately. Vercel's own guidance says **donations do not count as commercial
  use**, so a donation-funded free platform is defensible. Sponsorships or ads are not.
- **Cloudflare Workers + Atlas is the more durable choice**: no commercial-use clause, no
  org-repo restriction, per-minute crons, and the step-up is $5/mo not $20. Cost is a
  10 ms CPU-per-request ceiling and a less mature Next.js path (`@opennextjs/cloudflare`
  hit 1.0 GA Feb 2026).

**Email reality check:** Resend's free tier **can only deliver to your own account's email
address** until you verify a domain. Buy the domain before you build the signup flow.

### Cost

| | $0 launch | ~400 sessions/mo | ~3,000 sessions/mo |
|---|---|---|---|
| Video + Calendar | $0 | $0 | $0 |
| Hosting | $0 | $5 (CF Paid) | $20 |
| MongoDB | $0 (M0) | ~$9 (Flex) | ~$30 |
| Email | $0 | $0–20 | $20 |
| Auth | $0 | $0 | $0 |
| Domain | ~$1/mo | ~$1/mo | ~$1/mo |
| **Total** | **~$1/mo** | **~$15–35/mo** | **~$75–115/mo** |

The naive stack (Daily.co + Cal.com Platform + Clerk B2B + Vercel Pro) is **~$596/mo** for
the same 400 sessions. The Google Meet + Calendar decision is worth ~$580/mo.

---

## 8. Do NOT use Cal.com

My two research passes disagreed on the current license — one found Cal.com relicensed to
MIT as "Cal.diy" in April 2026 with the commercial product going closed-source; the other
found the older AGPLv3-core + commercial-`/ee` split. **Verify before relying on either.**
They agreed on the conclusion:

- **Cal.com Platform / Atoms has no usable free tier** (~$299/mo, and the FAQ now says the
  plan is deprecated / maintenance-only / no new sign-ups). API v1 was discontinued Feb 2026.
- **Cal.com Cloud free is 1 user** — round-robin needs paid seats at $12–15/user/mo.
  200 volunteers ≈ $2,400/mo. Structurally incompatible with free forever.
- **Self-hosting** gives you a whole second application to operate and patch, with a
  "community-maintained / non-production" disclaimer, to solve a problem that is ~300 lines
  of your own slot math.
- If you self-host anyway: `CALENDSO_ENCRYPTION_KEY` is **write-once** — rotating it
  permanently corrupts every stored calendar credential, unrecoverably.

**Read their source as a reference** (`date-ranges.ts`, `getBusyTimes.ts`,
`checkForConflicts.ts`) and steal the schema ideas. Don't adopt the product.

---

## 9. Anti-abuse

**No-show thresholds** — borrowed from ADPList, the only comparable free volunteer platform
at scale. Deliberately **asymmetric**, because volunteers are scarce and candidates are not:

| | Interviewer (scarce) | Candidate (abundant) |
|---|---|---|
| No-show / late cancel | Warn from 2nd; **4th → on break** | 1st warn; **2nd → suspension** |
| Expired requests | Warn 1st–4th; **5th → break** | 1st warn; **2nd → suspension** |

Definitions: no-show = absent 10+ min. Late cancel = within 3h of start. Expired = request
not answered within 48h. Rolling 30-day window.

- **You have no financial lever** (no payments, ever). Your levers are reputation, booking
  privileges, and suspension.
- **Escalating friction beats hard bans**: 1 strike → cap to 1 concurrent booking;
  2 strikes → 7-day cooldown. Far cheaper than adjudicating appeals.
- **Always ship an appeal path.** Unappealable auto-bans on a volunteer platform produce the
  worst kind of community incident.
- **Never punish early reschedules** — only no-shows. (Pramp gets this right.)

**Interviewer verification ladder** (strongest first):
1. **Work-email domain verification** → code to a claimed corporate address, checked against
   disposable/free-mail blocklists. Make it a **badge, not a gate** — contractors and
   recently-departed engineers legitimately fail it.
2. **GitHub OAuth** → account age, repos, orgs. Good bot filter, weak seniority signal,
   useless for PM/marketing/design interviewers.
3. **Manual moderator approval** before an interviewer appears in search. At volunteer scale
   this is feasible and the highest-signal option.

⚠️ **LinkedIn is a trap.** Sign In with LinkedIn (OIDC) returns only name/email/picture —
**no employer, no job title, no headline**. Those need partner APIs you won't be granted.
LinkedIn explicitly states the flow "does not verify user identities and should not be
marketed as such." **Do not ship a "LinkedIn verified" badge.**

**Rate limiting:** Turnstile on signup + interviewer application + booking creation
(skip login — OAuth gates it). Better Auth's DB-backed limiter on auth routes. A Mongo
counter collection for booking creation (booking spam is per-user, not per-IP).

---

## 10. Build order

**M1 — Signup phase (Phase 0)**
Auth + roles + profiles (track, seniority, languages, timezone) + `platformConfig`
+ admin panel with phase/toggle control + waitlist. **Ship this to the WhatsApp group first.**

**M2 — Supply side (Phase 1)**
Interviewer application + moderator approval queue + schedules & availability rules
+ slot materialization job + Google OAuth calendar connect.

**M3 — The loop (Phase 2)**
Slot search (track × language × timezone) + atomic claim booking + Google Calendar event
with Meet link + booking state machine + email.

**M4 — The product (Phase 3)**
Rubric feedback forms + question packs per track/level + reviews + reputation stats.

**M5 — Scale**
i18n UI, credits/reciprocity, no-show enforcement, public interviewer profiles,
"X sessions given" badges, analytics.

**Ship M1 within days, not weeks.** Phase 0 with a real signup form is what converts the
WhatsApp group's current enthusiasm into a user list. Everything after that is easier
because you'll know your actual supply.

---

## 11. Two things that will decide success (neither is code)

1. **Reduce the volunteer's marginal cost to exactly 60 minutes.** Volunteers churn because
   preparing a good interview is ~30 min of unpaid work on top of the hour. **Ship levelled
   question packs with expected signals, per track.** Nobody in this market does this. The
   rubric doubles as your quality floor.

2. **Recognition is the currency you pay volunteers in.** Public profile, "24 sessions given"
   counter, shareable badge, capacity caps so popular volunteers don't burn out. ADPList has
   40,000+ mentors and still has documented no-show and burnout problems — because they
   solved discovery and never solved accountability.

**Sustainability:** never subscriptions. Company sponsorship (the Karat "Brilliant Black
Minds" model — employers fund free sessions as CSR + pipeline access) plus donations.
Consider **AGPL for your own repo** so nobody — including a future you — can fork it into a
paid product. That makes "কখনো ব্যবসায়িক প্ল্যাটফর্ম হবে না" enforceable in code, not just a promise.
