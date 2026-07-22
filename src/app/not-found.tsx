import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { StatusBar } from "@/components/sections/status-bar";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 should never be indexed, but let crawlers follow the links out.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <StatusBar />
      <SiteHeader />

      <main id="main" className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-2xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <p className="stamp-label text-vermilion-deep">Error 404</p>

          {/* The numeral with a rubber stamp slapped across it — same motif as
              the membership card in the hero. */}
          <div className="relative mt-6 inline-block">
            <p className="display text-[clamp(5rem,20vw,10rem)] font-semibold leading-none">
              404
            </p>
            {/* Bigger offset on mobile: the numeral shrinks there but the stamp
                doesn't, so a small offset swallows the last digit. */}
            <div className="stamp absolute -bottom-2 -end-16 rotate-[-12deg] bg-paper px-3 py-2 text-center leading-tight sm:-end-12">
              <p className="text-[0.7rem] font-bold">Not</p>
              <p className="text-[0.7rem] font-bold">Found</p>
            </div>
          </div>

          <h1 className="display mt-9 text-balance text-[clamp(1.75rem,5vw,3rem)] font-semibold">
            This page isn&apos;t on the list.
          </h1>

          <p className="mx-auto mt-6 max-w-md text-pretty text-lg leading-relaxed text-ink-soft">
            The link you followed doesn&apos;t lead anywhere — it may have moved
            while we were still building the club. Nothing is broken on your
            end.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="press press-hover h-13 rounded-none bg-vermilion-strong px-8 text-base font-medium text-chalk hover:bg-vermilion-strong"
            >
              <Link href="/">
                Back to the club
                <ArrowUpRight
                  className="size-4 rtl:-scale-x-100"
                  strokeWidth={2.5}
                />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="press press-hover h-13 rounded-none border-ink bg-transparent px-8 text-base font-medium hover:bg-transparent"
            >
              <Link href="/about">About MockClub</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
