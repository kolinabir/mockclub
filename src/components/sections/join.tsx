import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { GoogleSignIn } from "@/components/google-sign-in";
import { Reveal } from "@/components/reveal";
import { getCurrentUser } from "@/lib/session";

/**
 * The site's one conversion point. Every CTA on every page aims at "#join", so
 * the anchor id is load-bearing — it stays even though what sits inside it has
 * changed from a waitlist form to real signup.
 *
 * Session-aware, like SiteHeader: showing "Continue with Google" to somebody
 * who is already signed in reads as a dead end. Which role they want is asked
 * once, properly, in /onboarding — so this section no longer asks it.
 */
export async function Join() {
  const user = await getCurrentUser();

  return (
    <section id="join" className="scroll-mt-20">
      <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8 sm:py-24 lg:py-32">
        <Reveal>
          <p className="stamp-label text-vermilion-deep">
            § 06 — Membership is open
          </p>
          <h2 className="display mt-6 text-[clamp(2rem,6.5vw,5rem)] font-semibold">
            {user ? "You're in." : "Join the club."}
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">
            {user
              ? "Your dashboard has everything next — finish your profile, and if you are giving an hour, set the hours you can give."
              : "Sign in with Google and you are a member. We ask for your name and email, nothing else. Then you tell us whether you want to practise or give an hour."}
          </p>

          <div className="mt-10 sm:mt-11">
            {user ? (
              <Link
                href="/dashboard"
                className="press press-hover mx-auto inline-flex h-13 items-center justify-center gap-2 border-[1.5px] border-ink bg-vermilion-strong px-8 text-base font-medium text-chalk"
              >
                Go to your dashboard
                <ArrowUpRight
                  className="size-4 rtl:-scale-x-100"
                  strokeWidth={2.5}
                />
              </Link>
            ) : (
              <GoogleSignIn />
            )}
          </div>

          <p className="stamp-label mt-7 text-ink-soft">
            Free forever · No card · Humans only
          </p>
        </Reveal>
      </div>
    </section>
  );
}
