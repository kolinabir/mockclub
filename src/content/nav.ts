/** Nav items. Anchor links use the "/#id" form so they resolve to the homepage
 *  section from any page; SmoothScroll handles the in-page case. "/about" is a
 *  real route and navigates normally. */
export const NAV_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Tracks", href: "/#tracks" },
  { label: "Volunteer", href: "/#volunteer" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/#faq" },
] as const;
