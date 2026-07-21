import { Reveal } from "@/components/reveal";
import { STEPS } from "@/content/steps";

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <Reveal>
          <p className="stamp-label text-vermilion-deep">§ 02 — How it works</p>
          <h2 className="display mt-5 max-w-3xl text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
            Three steps. No account fees, no upsell, no bot.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:mt-16 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              delay={i * 110}
              className="group bg-paper p-7 transition-colors hover:bg-card sm:p-8 lg:p-10"
            >
              <span className="display block text-6xl font-semibold text-ink/55 transition-colors group-hover:text-vermilion sm:text-7xl">
                {step.n}
              </span>
              <h3 className="display mt-5 text-2xl font-semibold sm:mt-6">
                {step.title}
              </h3>
              <p className="mt-4 leading-relaxed text-ink-soft">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
