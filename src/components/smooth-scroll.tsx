"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Lenis smooth scrolling, scoped to the marketing page.
 *
 * SEO / a11y notes — this is purely a client-side scroll behaviour:
 *  - It renders no DOM and never wraps content, so the server HTML crawlers
 *    receive is byte-identical. Nothing is virtualised or hidden.
 *  - Googlebot does not scroll, so this has no crawl or indexing impact.
 *  - It bails out entirely under `prefers-reduced-motion`, leaving native
 *    scrolling intact.
 *  - Anchor links (#how, #faq …) are intercepted so in-page nav still works;
 *    the URL hash is still updated, so deep links remain shareable.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      // Touch devices already have good native inertia; hijacking it makes
      // phones feel laggy and fights the browser's scroll anchoring.
      smoothWheel: true,
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Lenis takes over the scroll position, so native hash jumps stop working.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!link) return;

      const url = new URL(link.href, location.href);
      // Only handle links that stay on this page and point at an anchor. A
      // cross-page "/#how" (e.g. from /about) falls through to normal nav.
      if (url.pathname !== location.pathname || !url.hash) return;

      const target = document.querySelector(url.hash);
      if (!target) return;

      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
      // Keep the URL shareable without triggering a second native jump.
      history.pushState(null, "", url.hash);
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
