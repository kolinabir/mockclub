import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { auth, hasRole, ROLES } from "@/server/auth/auth";
import { getWaitlistStats, listWaitlist } from "@/server/waitlist/queries";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Session is per-request; never cache this page.
export const dynamic = "force-dynamic";

const CONTACT_LABEL: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  linkedin: "LinkedIn",
};

export default async function AdminPage() {
  // The real security boundary lives here — in the code that reads the data —
  // not in middleware. A middleware check is an optimisation, not a guarantee.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!hasRole(session.user.role, ROLES.admin)) redirect("/");

  const [stats, entries] = await Promise.all([
    getWaitlistStats(),
    listWaitlist(),
  ]);

  const interviewers = stats.byRole.interviewer ?? 0;
  const candidates = stats.byRole.candidate ?? 0;
  const ratio = interviewers > 0 ? (candidates / interviewers).toFixed(1) : "—";

  return (
    <>
      <SiteHeader />

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="stamp-label text-vermilion-deep">Admin</p>
          <h1 className="display mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold">
            The waitlist.
          </h1>
          <p className="mt-3 text-ink-soft">
            Signed in as {session.user.email}
          </p>

          {/* Supply is the gate — interviewers are the scarce side. */}
          <dl className="mt-10 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total signups", String(stats.total), false],
              ["Interviewers", String(interviewers), true],
              ["Candidates", String(candidates), false],
              ["Candidates per interviewer", ratio, false],
            ].map(([label, value, highlight]) => (
              <div key={label as string} className="bg-paper p-6">
                <dt className="stamp-label text-ink-soft">{label}</dt>
                <dd
                  className={`display mt-2 text-4xl font-semibold ${
                    highlight ? "text-vermilion-deep" : ""
                  }`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {Object.entries(stats.byContact).map(([k, n]) => (
              <p key={k} className="stamp-label text-ink-soft">
                {CONTACT_LABEL[k] ?? k}: {n}
              </p>
            ))}
          </div>

          <div className="press mt-10 overflow-x-auto bg-card">
            <table className="w-full min-w-[46rem] text-start text-sm">
              <thead>
                <tr className="border-b border-ink/15">
                  {["When", "Wants to", "Via", "Contact"].map((h) => (
                    <th
                      key={h}
                      className="stamp-label px-5 py-4 text-start text-ink-soft"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e._id} className="border-b border-ink/10">
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                      {new Date(e.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          e.role === "interviewer"
                            ? "font-medium text-vermilion-deep"
                            : "text-ink-soft"
                        }
                      >
                        {e.role === "interviewer" ? "Give an hour" : "Practise"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {CONTACT_LABEL[e.contactType] ?? e.contactType}
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      <span className="select-all">{e.contactValue}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && (
              <p className="px-5 py-10 text-center text-ink-soft">
                No signups yet.
              </p>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
