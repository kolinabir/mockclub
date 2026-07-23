"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { MEMBER_CARDS, type MemberCardData } from "@/content/member-cards";

const N = MEMBER_CARDS.length;
const AUTO_MS = 4200;
const RESUME_AFTER_MS = 9000;
const FLY_MS = 520;
const SWIPE_THRESHOLD = 96;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function CardFace({ data }: { data: MemberCardData }) {
  const rows: [string, string][] = [
    ["Track", data.track],
    ["Level", data.level],
    ["Language", data.language],
    ["Timezone", data.timezone],
  ];

  return (
    <article className="press h-full bg-card">
      <header className="flex items-center justify-between border-b border-ink/15 px-6 py-4">
        <p className="stamp-label">Membership card</p>
        <p className="stamp-label text-ink-soft">No. {data.no}</p>
      </header>

      <div className="px-6 py-7">
        <p className="stamp-label text-ink-soft">Practising for</p>
        <p className="display mt-2.5 whitespace-nowrap text-[clamp(1.6rem,4vw,2.25rem)] font-semibold">
          {data.role}
        </p>

        <Separator className="my-6 bg-ink/15" />

        <dl className="space-y-3.5">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="stamp-label shrink-0 text-ink-soft">{label}</dt>
              <dd className="text-end font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <Separator className="my-6 bg-ink/15" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="stamp-label text-ink-soft">Session fee</p>
            <p className="display text-5xl font-semibold text-vermilion-deep">
              $0.00
            </p>
          </div>

          <div className="flex -rotate-[14deg] items-center gap-2.5">
            <Logo className="size-9 shrink-0 text-ink" title="" />
            <div className="stamp px-2.5 py-2 text-center leading-tight">
              <p className="text-[0.625rem] font-bold">Real</p>
              <p className="text-[0.625rem] font-bold">Humans</p>
              <p className="mt-1 text-[0.5625rem]">NEVER AI</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-ink/15 bg-panel px-6 py-3.5">
        <p className="stamp-label text-panel-fg/70">
          Valid indefinitely · Non-transferable · Priceless
        </p>
      </footer>
    </article>
  );
}

/** Resting transform for a card at stack depth `rel` (0 = top of deck). */
function restTransform(rel: number) {
  if (rel === 0) return { x: 0, y: 0, rot: 0, scale: 1, z: 50, opacity: 1 };
  if (rel === 1)
    return { x: 13, y: 10, rot: 2, scale: 0.955, z: 40, opacity: 1 };
  if (rel === 2)
    return { x: 26, y: 20, rot: 3.6, scale: 0.91, z: 30, opacity: 1 };
  // Deeper cards wait behind the visible three, faded out.
  return { x: 26, y: 20, rot: 3.6, scale: 0.9, z: 20, opacity: 0 };
}

export function MemberCard() {
  const [active, setActive] = useState(0);
  const [flung, setFlung] = useState<{ id: number; dir: 1 | -1 } | null>(null);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pausedUntil = useRef(0);
  const startX = useRef(0);
  const flyTimer = useRef<number | null>(null);

  const pause = useCallback(() => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
  }, []);

  const advance = useCallback((dir: 1 | -1 = -1) => {
    setActive((a) => {
      setFlung({ id: a, dir });
      return (a + 1) % N;
    });
    if (flyTimer.current) window.clearTimeout(flyTimer.current);
    flyTimer.current = window.setTimeout(() => setFlung(null), FLY_MS);
  }, []);

  // Auto-advance, paused for reduced motion, hidden tabs, hover/focus, and
  // for a while after any manual interaction.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() < pausedUntil.current) return;
      advance(-1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [advance]);

  useEffect(() => {
    return () => {
      if (flyTimer.current) window.clearTimeout(flyTimer.current);
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (flung) return;
    pause();
    setDragging(true);
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    setDrag(e.clientX - startX.current);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(drag) > SWIPE_THRESHOLD) advance(drag < 0 ? -1 : 1);
    setDrag(0);
  };

  return (
    <div
      className="rise mx-auto w-full max-w-md lg:mx-0"
      style={{ animationDelay: "520ms" }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Example membership cards"
    >
      <div className="relative isolate select-none">
        {MEMBER_CARDS.map((card, i) => {
          const isTop = i === active && !flung;
          const rel = (i - active + N) % N;
          const rest = restTransform(rel);

          let x = rest.x;
          let rot = rest.rot;
          let { y, z, opacity, scale } = rest;
          let transition = `transform ${FLY_MS}ms ${EASE}, opacity ${FLY_MS}ms ${EASE}`;

          if (flung?.id === i) {
            // Retiring to the back of the deck IN PLACE — shrink, fade and
            // settle onto the pile. Never leaves the card's footprint, so it
            // can't overlap neighbouring content.
            x = 26 + flung.dir * 10;
            y = 20;
            rot = flung.dir * 6;
            scale = 0.9;
            opacity = 0;
            z = 60;
          } else if (isTop && (dragging || drag !== 0)) {
            // Following the finger with rubber-band resistance so the card
            // stays near the deck instead of travelling over the hero copy.
            x = drag * 0.35;
            rot = drag * 0.02;
            if (dragging) transition = "none";
          }

          return (
            <div
              key={card.role}
              className={i === 0 ? "relative" : "absolute inset-0"}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? endDrag : undefined}
              onPointerCancel={isTop ? endDrag : undefined}
              style={{
                zIndex: z,
                opacity,
                transition,
                transform: `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${scale})`,
                cursor: isTop ? (dragging ? "grabbing" : "grab") : "default",
                touchAction: "pan-y",
                pointerEvents: rel === 0 && !flung ? "auto" : "none",
              }}
            >
              <CardFace data={card} />
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2.5">
        {MEMBER_CARDS.map((c, i) => (
          <button
            key={c.role}
            type="button"
            onClick={() => {
              pause();
              if (i !== active) setActive(i);
            }}
            aria-label={`Show ${c.role} card`}
            aria-current={i === active}
            className={`h-1.5 rounded-full transition-all ${
              i === active
                ? "w-7 bg-vermilion-deep"
                : "w-1.5 bg-ink/35 hover:bg-ink/60"
            }`}
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {MEMBER_CARDS[active]?.role}, {MEMBER_CARDS[active]?.language}
      </p>
    </div>
  );
}
