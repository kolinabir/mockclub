import { Reveal } from "@/components/reveal";
import { SESSION_FLOW } from "@/content/session-flow";

export function SessionFlow() {
  return (
    <section
      id="session"
      className="scroll-mt-20 border-b border-ink/15 bg-panel text-panel-fg"
    >
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <Reveal className="max-w-3xl">
          <p className="stamp-label text-vermilion-light">
            § — What your hour looks like
          </p>
          <h2 className="display mt-5 text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
            An hour, start to finish.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-panel-fg/80">
            No mystery, no cold open. Here is exactly what a session looks like,
            from the moment you book to the notes that land in your inbox.
          </p>
        </Reveal>

        <ol className="mt-12 grid gap-px bg-panel-fg/20 sm:mt-16">
          {SESSION_FLOW.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={i * 70}
              className="grid gap-3 bg-panel p-6 sm:grid-cols-[7rem_1fr] sm:gap-8 sm:p-8"
            >
              <p className="stamp-label pt-1 text-vermilion-light">
                {step.when}
              </p>
              <div>
                <h3 className="display text-xl font-semibold sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-2.5 leading-relaxed text-panel-fg/80">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
