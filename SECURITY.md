# Security Policy

## Reporting a vulnerability

**Please do not open a public issue.**

Report privately via [GitHub Security Advisories](../../security/advisories/new), or
email **security@mockclub.com**.

Include: what you found, how to reproduce it, and what an attacker could do with it.

We'll acknowledge within **72 hours** and keep you updated. If you'd like credit, tell us
how you want to be named — we'll always offer it. We have no bug bounty; this is a
volunteer project with no revenue.

## Scope — what we care about most

This platform holds things that matter to people's careers and safety:

- **Personal data** — names, emails, employers, timezones, career goals
- **Google OAuth refresh tokens** — access to volunteers' calendars
- **Private feedback** — candid written assessments, visible only to the candidate
- **Role escalation** — anything letting a user reach `moderator` or `admin`
- **Meeting links** — a leaked link means a stranger can join someone's interview

Auth bypass, IDOR on bookings or feedback, token exposure, and privilege escalation are
the highest-severity classes for us.

## Out of scope

- Reports from automated scanners with no demonstrated impact
- Missing headers or rate limits with no exploit path
- Social engineering of our volunteers
- Denial of service

## For contributors

- Never log tokens, refresh tokens, or meeting URLs.
- Encrypt Google refresh tokens at rest. (Cal.com stores these as plaintext JSON — do
  not copy that.)
- On revocation, set an `invalid` flag on the credential. Don't delete it; you lose the
  ability to tell the user why their calendar stopped working.
- Treat a Whereby-style `hostRoomUrl` or a Jitsi moderator JWT as a bearer secret. Never
  put one in a shared calendar description.
