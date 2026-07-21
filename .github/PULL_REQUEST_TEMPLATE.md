## What does this change?

<!-- One or two sentences. Link the issue: Closes #123 -->

## How did you test it?

<!-- Required. "Ran it locally and clicked through X" is a fine answer. -->

## Checklist

- [ ] `npm run lint` and `npm run build` both pass
- [ ] Business logic is in `src/server/`, not `src/app/`
- [ ] No hardcoded user-facing English (strings are translatable)
- [ ] No payment code, no AI features
- [ ] Times: instants stored UTC, recurring rules stored local + IANA zone
- [ ] Any booking write is an atomic claim, not find-then-insert
- [ ] Checked in both light and dark mode
- [ ] Animations respect `prefers-reduced-motion`

## Screenshots

<!-- For any UI change. Light and dark if relevant. -->
