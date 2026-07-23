import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Rewritten from the shadcn default, which set state inside an effect — the
 * project's lint rules reject that (it triggers cascading renders).
 * `useSyncExternalStore` is the right primitive here: matchMedia IS an external
 * store, and this also gives a correct SSR snapshot instead of a first-paint
 * flash of the wrong layout.
 */
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // Server has no viewport; assume desktop so the sidebar renders expanded.
    () => false,
  );
}
