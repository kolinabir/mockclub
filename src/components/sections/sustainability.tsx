import { Reveal } from "@/components/reveal";

const PILLARS: [string, string][] = [
  [
    "Volunteers give the hour",
    "The most expensive part of any interview — an experienced person's time — is donated. That is the whole model, and it is why the price to you is, and stays, nothing.",
  ],
  [
    "The founders cover the rest",
    "Right now, we — the founders — pay the hosting and running costs ourselves. If you want to help, you can sponsor sessions or chip in a small donation, but it is always optional. You are never the product being sold.",
  ],
  [
    "Open source keeps it honest",
    "Because the platform is public and licensed to stay that way, it cannot quietly grow a paywall later. The promise that this stays free isn't a marketing line — it is written into the code and the licence.",
  ],
];

export function Sustainability() {
  return (
    <section id="why-free" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <Reveal className="max-w-3xl">
          <p className="stamp-label text-vermilion-deep">
            § — Why it&apos;s free
          </p>
          <h2 className="display mt-5 text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
            &ldquo;Free&rdquo; only means something if it lasts.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Plenty of things are free until they are not. Here is exactly how
            MockClub pays for itself without ever charging the person who came
            here to practise — so you can trust that the price will still be
            zero the next time you need it.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:mt-16 md:grid-cols-3">
          {PILLARS.map(([title, body], i) => (
            <Reveal key={title} delay={i * 100} className="bg-paper p-7 sm:p-8">
              <span className="display text-4xl font-semibold text-vermilion-deep">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="display mt-5 text-xl font-semibold sm:text-2xl">
                {title}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
