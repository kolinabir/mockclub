import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";

export function Join() {
  return (
    <section id="join" className="scroll-mt-20">
      <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-24 lg:py-32">
        <Reveal>
          <p className="stamp-label text-vermilion-deep">§ 06 — Membership is open</p>
          <h2 className="display mt-6 text-[clamp(2rem,6.5vw,5rem)] font-semibold">
            The club is being built in the open.
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-soft sm:mt-8">
            We are gathering interviewers first. Put your name down and you will
            be in the first group invited the moment there are enough volunteers
            to fill a calendar — and not a day sooner, because an empty booking
            page helps nobody.
          </p>

          <form className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:mt-11 sm:flex-row">
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-13 flex-1 rounded-none border-[1.5px] border-ink bg-paper px-4 text-base text-ink outline-none transition-shadow placeholder:text-ink-soft focus-visible:shadow-[4px_4px_0_0_var(--vermilion)]"
            />
            <Button
              type="submit"
              size="lg"
              className="press press-hover h-13 rounded-none bg-ink px-8 text-base font-medium text-paper hover:bg-ink"
            >
              Reserve my seat
            </Button>
          </form>
          <p className="stamp-label mt-5 text-ink-soft">
            No spam · No card · No catch
          </p>
        </Reveal>
      </div>
    </section>
  );
}
