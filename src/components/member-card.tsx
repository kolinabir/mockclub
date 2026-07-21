import { Separator } from "@/components/ui/separator";

const ROWS: [string, string][] = [
  ["Track", "Software Engineering"],
  ["Level", "Entry / Junior"],
  ["Language", "বাংলা · English"],
  ["Timezone", "Asia/Dhaka (GMT+6)"],
];

export function MemberCard() {
  return (
    <div
      className="rise relative mx-auto w-full max-w-md lg:mx-0"
      style={{ animationDelay: "520ms" }}
    >
      {/* Stacked paper behind, for depth */}
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rotate-[1.5deg] border-[1.5px] border-ink/25 bg-card"
      />
      <div
        aria-hidden
        className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[0.75deg] border-[1.5px] border-ink/35 bg-card"
      />

      <article className="press relative bg-card">
        <header className="flex items-center justify-between border-b border-ink/15 px-6 py-4">
          <p className="stamp-label">Membership card</p>
          <p className="stamp-label text-ink-soft">No. 000001</p>
        </header>

        <div className="px-6 py-7">
          <p className="stamp-label text-ink-soft">Practising for</p>
          <p className="display mt-2.5 text-4xl font-semibold">
            Backend Engineer
          </p>

          <Separator className="my-6 bg-ink/15" />

          <dl className="space-y-3.5">
            {ROWS.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4">
                <dt className="stamp-label text-ink-soft">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <Separator className="my-6 bg-ink/15" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="stamp-label text-ink-soft">Session fee</p>
              <p className="display text-5xl font-semibold text-vermilion">
                $0.00
              </p>
            </div>

            {/* Rubber stamp — the thing people remember */}
            <div className="stamp -rotate-[14deg] px-3.5 py-2.5 text-center leading-tight">
              <p className="text-[0.6rem] font-bold">Real</p>
              <p className="text-[0.6rem] font-bold">Humans</p>
              <p className="mt-1 text-[0.5rem] opacity-80">NEVER AI</p>
            </div>
          </div>
        </div>

        <footer className="border-t border-ink/15 bg-ink px-6 py-3.5">
          <p className="stamp-label text-paper/70">
            Valid indefinitely · Non-transferable · Priceless
          </p>
        </footer>
      </article>
    </div>
  );
}
