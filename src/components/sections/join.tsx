import { Reveal } from "@/components/reveal";
import { WaitlistForm } from "@/components/waitlist-form";

export function Join() {
  return (
    <section id="join" className="scroll-mt-20">
      <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8 sm:py-24 lg:py-32">
        <Reveal>
          <p className="stamp-label text-vermilion-deep">
            § 06 — Membership is open
          </p>
          <h2 className="display mt-6 text-[clamp(2rem,6.5vw,5rem)] font-semibold">
            Put your name down.
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-soft sm:mt-8">
            We are gathering people first. Leave whichever contact suits you —
            email, WhatsApp, Telegram, or LinkedIn — and tell us whether you
            want to practise or give an hour. We will reach out as the first
            group forms.
          </p>

          <div className="mt-10 sm:mt-11">
            <WaitlistForm />
          </div>

          <p className="stamp-label mt-7 text-ink-soft">
            No spam · No card · No catch
          </p>
        </Reveal>
      </div>
    </section>
  );
}
