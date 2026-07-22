import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { listMembers, type MemberRow } from "@/server/admin/members";
import { getWaitlistStats, listWaitlist } from "@/server/waitlist/queries";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const CONTACT_LABEL: Record<string, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  linkedin: "LinkedIn",
};

const shortDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-paper p-5">
      <dt className="stamp-label text-ink-soft">{label}</dt>
      <dd
        className={`display mt-2 text-3xl font-semibold tabular-nums ${
          highlight ? "text-vermilion-deep" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/** A yes/no fact, so a row scans without reading words. */
function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={
        on ? "font-medium text-olive" : "text-ink-soft"
      }
      title={label}
    >
      {on ? "Yes" : "No"}
    </span>
  );
}

function MemberTable({ rows }: { rows: MemberRow[] }) {
  if (rows.length === 0)
    return (
      <p className="press mt-4 bg-card p-5 text-sm text-ink-soft">
        No members yet.
      </p>
    );

  return (
    // The table scrolls inside its own box — without this the whole page
    // scrolls sideways on a phone.
    <div className="press mt-4 overflow-x-auto bg-card">
      <table className="w-full min-w-[52rem] text-start text-sm">
        <thead>
          <tr className="border-b border-ink/15">
            {[
              "Member",
              "Role",
              "Onboarded",
              "Profile",
              "Hours",
              "Bookable",
              "Time zone",
            ].map((h) => (
              <th
                key={h}
                className="stamp-label px-4 py-3.5 text-start text-ink-soft"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b border-ink/10">
              <td className="px-4 py-3">
                <span className="block font-medium">{r.name}</span>
                <span className="block text-xs text-ink-soft">{r.email}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    r.isInterviewer
                      ? "font-medium text-vermilion-deep"
                      : "text-ink-soft"
                  }
                >
                  {r.isInterviewer ? "Interviewer" : "Candidate"}
                </span>
                {r.paused && (
                  <span className="block text-xs text-ink-soft">paused</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                {r.onboardedAt ? shortDate(r.onboardedAt) : "—"}
              </td>
              <td className="px-4 py-3">
                <Flag on={r.profileComplete} label="Profile complete" />
              </td>
              <td className="px-4 py-3 tabular-nums text-ink-soft">
                {r.isInterviewer ? r.openSlots : "—"}
              </td>
              <td className="px-4 py-3">
                {r.isInterviewer ? (
                  <Flag on={r.bookable} label="Bookable" />
                ) : (
                  <span className="text-ink-soft">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                {r.timeZone ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage() {
  // The real security boundary lives here — in the code that reads the data —
  // not in the layout. The dashboard layout guards the session; this guards the
  // role, and a server component that reads admin data must check it itself.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.isAdmin) redirect("/dashboard");

  const [members, waitlistStats, waitlist] = await Promise.all([
    listMembers(),
    getWaitlistStats(),
    listWaitlist(),
  ]);

  const { stats } = members;
  const ratio =
    stats.interviewers > 0
      ? (stats.candidates / stats.interviewers).toFixed(1)
      : "—";

  return (
    <div className="mx-auto max-w-5xl">
      <p className="stamp-label text-vermilion-deep">Admin</p>
      <h1 className="display mt-3 text-[clamp(1.875rem,4.5vw,3rem)] font-semibold">
        The club, from the inside.
      </h1>
      <p className="mt-3 text-ink-soft">Signed in as {user.email}</p>

      <section className="mt-10">
        <h2 className="stamp-label text-ink-soft">Members</h2>
        {/* Supply is the gate — bookable interviewers, not signups, is the
            number that decides whether booking can open. */}
        <dl className="mt-3 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Members" value={String(stats.total)} />
          <Stat
            label="Bookable interviewers"
            value={String(stats.bookableInterviewers)}
            highlight
          />
          <Stat label="Candidates" value={String(stats.candidates)} />
          <Stat label="Bookable hours" value={String(stats.openSlots)} />
        </dl>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {stats.interviewers} {stats.interviewers === 1 ? "person" : "people"}{" "}
          picked interviewer, {stats.bookableInterviewers} of them can actually
          be booked. {stats.onboarded} of {stats.total} finished onboarding.
          Ratio: {ratio} candidates per interviewer.
        </p>

        <MemberTable rows={members.rows} />

        {/* Never let a trimmed table read as the whole list. */}
        {members.truncated && (
          <p className="mt-3 text-sm text-ink-soft">
            Showing the {members.rows.length} newest of {stats.total} members.
            The counts above cover all of them.
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="stamp-label text-ink-soft">Waitlist</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Addresses left on the landing page, before signup —{" "}
          {waitlistStats.total} in total.{" "}
          {Object.entries(waitlistStats.byContact)
            .map(([k, n]) => `${CONTACT_LABEL[k] ?? k}: ${n}`)
            .join(" · ")}
        </p>

        <div className="press mt-4 overflow-x-auto bg-card">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead>
              <tr className="border-b border-ink/15">
                {["When", "Wants to", "Via", "Contact"].map((h) => (
                  <th
                    key={h}
                    className="stamp-label px-4 py-3.5 text-start text-ink-soft"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waitlist.map((e) => (
                <tr key={e._id} className="border-b border-ink/10">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {shortDate(e.createdAt)}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-ink-soft">
                    {CONTACT_LABEL[e.contactType] ?? e.contactType}
                  </td>
                  <td className="px-4 py-3">{e.contactValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
