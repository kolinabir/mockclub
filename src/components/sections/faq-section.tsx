import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ } from "@/content/faq";

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:py-28">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <p className="stamp-label text-vermilion-deep">§ 05 — Questions</p>
          <h2 className="display mt-5 text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
            The ones everybody asks.
          </h2>
          <p className="mt-6 max-w-xs leading-relaxed text-ink-soft">
            Still not sure how the club works? The story behind it — who runs it
            and why it stays free — lives on the about page.
          </p>
          <Link
            href="/about"
            className="mt-5 inline-flex items-center gap-1.5 font-medium text-vermilion-deep transition-colors hover:text-ink"
          >
            Read about MockClub
            <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
          </Link>
        </Reveal>

        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-ink/15">
              <AccordionTrigger className="py-5 text-start font-body text-base font-medium hover:text-vermilion hover:no-underline sm:py-6 sm:text-lg">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-base leading-relaxed text-ink-soft sm:pb-7">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
