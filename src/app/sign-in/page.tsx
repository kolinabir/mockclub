import type { Metadata } from "next";

import { GoogleSignIn } from "@/components/google-sign-in";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { StatusBar } from "@/components/sections/status-bar";

export const metadata: Metadata = {
  title: "Sign in",
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
