import Link from "next/link";

import { GithubMark } from "@/components/github-mark";
import { Logo } from "@/components/logo";
import { NAV_LINKS } from "@/content/nav";
import { SITE_EMAIL, SITE_REPO_URL } from "@/lib/site";

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
            <p className="mt-5">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="font-medium text-panel-fg underline decoration-vermilion-light decoration-2 underline-offset-4 transition-colors hover:text-vermilion-light"
              >
                {SITE_EMAIL}
              </a>
            </p>
            <p className="mt-5">
              <a
                href={SITE_REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2.5 border border-panel-fg/25 px-4 py-2.5 text-sm font-medium text-panel-fg/85 transition-colors hover:border-vermilion-light hover:text-vermilion-light"
              >
                <GithubMark className="size-[18px]" />
                Read the source on GitHub
              </a>
            </p>
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
