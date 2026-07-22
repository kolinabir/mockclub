"use client";

import { useEffect } from "react";

import { HOME_SECTIONS, sectionTitle } from "@/content/sections";

/** Where in the viewport a section counts as "the one being read". Matches the
 *  sticky header height plus a little breathing room, and the -80 offset
 *  SmoothScroll uses when it jumps to an anchor. */
const READING_LINE = 100;

/**
 * Keeps the URL hash and the document title in sync with the section in view.
 *
 * Renders nothing and runs only in the browser, so the server HTML — and
 * therefore everything a crawler sees — is untouched. The title swap is for
 * humans: tabs, bookmarks and shared "/#tracks" links say which part of the
 * page they point at.
 *
 * The hash is written with replaceState, not pushState: a scroll is not a
 * navigation, and pushing would stuff the back button with one entry per
 * section. Anchor clicks still push (see SmoothScroll), so Back after clicking
 * "Tracks" returns where you were.
 */
export function SectionTracker() {
  useEffect(() => {
    // The server-rendered title is the fallback for the hero / top of page.
    const defaultTitle = document.title;

    let current: string | null = null;
    let frame = 0;

    const sync = () => {
      frame = 0;

      const line = window.scrollY + READING_LINE;
      let active: (typeof HOME_SECTIONS)[number] | null = null;

      for (const section of HOME_SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top + window.scrollY <= line) {
          active = section;
        }
      }

      // The last section is shorter than a viewport, so it can never reach the
      // reading line on its own — at the bottom of the page, claim it.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) active = HOME_SECTIONS[HOME_SECTIONS.length - 1];

      const id = active?.id ?? null;
      if (id === current) return;
      current = id;

      document.title = active ? sectionTitle(active.title) : defaultTitle;
      history.replaceState(
        null,
        "",
        id ? `#${id}` : location.pathname + location.search,
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      document.title = defaultTitle;
    };
  }, []);

  return null;
}
