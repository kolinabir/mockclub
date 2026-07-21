import { LanguageMarquee } from "@/components/language-marquee";
import { SmoothScroll } from "@/components/smooth-scroll";
import { StructuredData } from "@/components/structured-data";
import { FaqSection } from "@/components/sections/faq-section";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { Join } from "@/components/sections/join";
import { Sustainability } from "@/components/sections/sustainability";
import { SiteFooter } from "@/components/sections/site-footer";
import { SessionFlow } from "@/components/sections/session-flow";
import { SiteHeader } from "@/components/sections/site-header";
import { StatusBar } from "@/components/sections/status-bar";
import { TheGap } from "@/components/sections/the-gap";
import { Tracks } from "@/components/sections/tracks";
import { Volunteer } from "@/components/sections/volunteer";

export default function Home() {
  return (
    <>
      <StructuredData />
      <SmoothScroll />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>

      <StatusBar />
      <SiteHeader />

      <main id="main" className="flex-1">
        <Hero />
        <LanguageMarquee />
        <TheGap />
        <HowItWorks />
        <SessionFlow />
        <Tracks />
        <Volunteer />
        <Sustainability />
        <FaqSection />
        <Join />
      </main>

      <SiteFooter />
    </>
  );
}
