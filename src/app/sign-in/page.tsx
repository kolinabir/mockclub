import type { Metadata } from "next";

import { GoogleSignIn } from "@/components/google-sign-in";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { StatusBar } from "@/components/sections/status-bar";
import { SITE_URL } from "@/lib/site";

/**
 * Deliberately noindex. A sign-in screen has no search demand and no content to
 * rank — indexing it only competes with the homepage for the brand query. But
 * the URL does get shared and pasted into chat apps, so it still needs a real
 * description and OG tags: those are unrelated to ranking and always worth having.
 */
export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to MockClub with Google to book a free mock interview or offer an hour as a volunteer.",
  alternates: { canonical: "/sign-in" },
  openGraph: {
    title: "Sign in to MockClub",
    description:
      "Free mock interviews with real people. Sign in with Google — name and email only.",
    url: `${SITE_URL}/sign-in`,
  },
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <>
      <StatusBar />
      <SiteHeader />

      <main id="main" className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <p className="stamp-label text-vermilion-deep">Members</p>
          <h1 className="display mt-5 text-[clamp(2rem,5.5vw,3.5rem)] font-semibold">
            Sign in to the club.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-pretty text-lg leading-relaxed text-ink-soft">
            We only ask Google for your name and email — nothing else, and never
            your calendar at this step.
          </p>

          <div className="mt-10">
            <GoogleSignIn />
          </div>

          <p className="stamp-label mt-7 text-ink-soft">
            Free forever · No card · Humans only
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
