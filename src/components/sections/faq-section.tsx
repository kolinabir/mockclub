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
        <Reveal>
          <p className="stamp-label text-vermilion-deep">§ 05 — Questions</p>
          <h2 className="display mt-5 text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
            The ones everybody asks.
          </h2>
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
