# MockClub brand assets

## The mark
A vermilion **C** holding a chevron **M** — the club holding you while you practise.

## Colours
| Token | Hex | Use |
|---|---|---|
| Ink | `#17150F` | The M, text on light |
| Paper | `#F2EDE3` | Background, the M on dark |
| Vermilion | `#D8452A` | The C — never change this |

## Files

**Vector masters** — the source of truth. Prefer these; regenerate PNGs from them.
- `mark.svg` — transparent
- `mark-on-paper.svg` / `mark-on-ink.svg` — solid backgrounds
- `mark-rounded.svg` — rounded square (what the PNGs below are built from)

**PNG** (`png/`) — rounded square, for app icons and social avatars
- `mockclub-rounded-512.png`
- `mockclub-rounded-1024.png`
- `mockclub-rounded-2048.png`

## Usage
- On dark backgrounds use `mark-on-ink` — the M flips to paper, the C stays vermilion.
- Social avatars / app icons: `mockclub-rounded-512` or larger.
- Don't recolour the C, stretch the mark, or add effects.

## Regenerating PNGs
```bash
npx sharp-cli -i brand/mark-rounded.svg -o brand/png/mockclub-rounded-512.png resize 512 512
```
Or any SVG→PNG tool. The in-app icons (`src/app/icon.svg`, `favicon.ico`, `apple-icon.tsx`)
are separate and already wired up — don't replace them with these.
