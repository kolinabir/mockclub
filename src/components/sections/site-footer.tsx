import Link from "next/link";

import { Logo } from "@/components/logo";
import { NAV_LINKS } from "@/content/nav";

export function SiteFooter() {
  return (
    <footer className="rule-thick bg-panel text-panel-fg">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-sm">
            <p className="flex items-center gap-3">
              <Logo className="size-10 shrink-0 text-paper" />
              <span className="display text-3xl font-semibold">MockClub</span>
            </p>
            <p className="display mt-3 text-2xl font-semibold text-vermilion-light">
              Made by devs, for everyone.
            </p>
            <p className="mt-4 leading-relaxed text-panel-fg/75">
              A volunteer-run practice club. Free forever, run by people who
              remember what it was like to be starting out.
            </p>
            {/*   <p className="stamp-label mt-6 text-panel-fg/70">Get in touch</p> */}
            {/* <ContactIconRow className="mt-3" /> */}
          </div>

          <div className="flex flex-wrap gap-12 sm:gap-14">
            <div>
              <p className="stamp-label text-panel-fg/70">Club</p>
              <ul className="mt-4 space-y-2.5">
                {NAV_LINKS.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-panel-fg/85 transition-colors hover:text-vermilion"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="stamp-label text-panel-fg/70">Principles</p>
              <ul className="mt-4 space-y-2.5 text-panel-fg/85">
                <li>Always free</li>
                <li>Humans only</li>
                <li>Open source</li>
                <li>Never for sale</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-panel-fg/20 pt-7 sm:mt-14">
          <p className="stamp-label text-panel-fg/70">
            © {new Date().getFullYear()} MockClub
          </p>
          <p className="stamp-label text-panel-fg/70">
            Never a business. Not now, not later.
          </p>
        </div>
      </div>
    </footer>
  );
}
