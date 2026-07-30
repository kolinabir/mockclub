import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MemberSearch } from "@/components/dashboard/member-search";
import { getCurrentUser } from "@/lib/session";
import {
  MEMBER_FILTERS,
  searchMembers,
  type MemberFilter,
} from "@/server/admin/members";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Members · Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const FILTER_LABEL: Record<MemberFilter, string> = {
  all: "All",
  interviewer: "Interviewers",
  candidate: "Candidates",
  bookable: "Bookable",
  incomplete: "Incomplete profile",
};

const shortDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/** Build a directory URL, dropping params that are at their defaults. */
function directoryHref(q: string, filter: MemberFilter, page: number) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (filter !== "all") p.set("filter", filter);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return `/dashboard/admin/members${s ? `?${s}` : ""}`;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Role is re-checked here, not inherited — a page that reads admin data
  // guards itself (same rule as the admin overview).
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.isAdmin) redirect("/dashboard");

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const filter: MemberFilter = MEMBER_FILTERS.includes(
    sp.filter as MemberFilter,
  )
    ? (sp.filter as MemberFilter)
    : "all";
  const requestedPage = Number(sp.page) || 1;

  const data = await searchMembers({ q, filter, page: requestedPage });

  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="stamp-label text-vermilion-deep">Admin</p>
      <h1 className="display mt-3 text-[clamp(1.875rem,4.5vw,3rem)] font-semibold">
        Members.
      </h1>
      <p className="mt-3 text-ink-soft">
        Every member on the platform — {data.grandTotal} in total. Click a row
        for the full record.
      </p>

      {/* Still a GET form — the URL is the state, so views are shareable and
          the back button works. The client wrapper adds ONE behaviour: an
          emptied box drops its stale query after a pause (searching itself
          stays click-to-search). Keyed on the URL state so navigation resets
          the input instead of leaving stale text. */}
      <div className="mt-8">
        <MemberSearch key={`${q}|${filter}`} initialQ={q} filter={filter} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {MEMBER_FILTERS.map((f) => (
          <Link
            key={f}
            href={directoryHref(q, f, 1)}
            aria-current={filter === f}
            className={cn(
              "border-[1.5px] px-3.5 py-2 text-sm font-medium transition-colors",
              filter === f
                ? "border-ink bg-ink text-paper"
                : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {FILTER_LABEL[f]}
          </Link>
        ))}
      </div>

      {data.rows.length === 0 ? (
        <p className="press mt-6 bg-card p-5 text-sm text-ink-soft">
          Nobody matches{q ? ` “${q}”` : ""} with this filter.
        </p>
      ) : (
        <div className="press mt-6 overflow-x-auto bg-card">
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
              {data.rows.map((r) => (
                <tr
                  key={r.userId}
                  className="border-b border-ink/10 transition-colors hover:bg-paper"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/members/${r.userId}`}
                      className="group block"
                    >
                      <span className="block font-medium underline-offset-4 group-hover:underline">
                        {r.name}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {r.email}
                      </span>
                    </Link>
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
                      <span className="block text-xs text-ink-soft">
                        paused
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {r.onboardedAt ? shortDate(r.onboardedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.profileComplete
                          ? "font-medium text-olive"
                          : "text-ink-soft"
                      }
                    >
                      {r.profileComplete ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">
                    {r.isInterviewer ? r.openSlots : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.isInterviewer ? (
                      <span
                        className={
                          r.bookable
                            ? "font-medium text-olive"
                            : "text-ink-soft"
                        }
                      >
                        {r.bookable ? "Yes" : "No"}
                      </span>
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
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Showing {from}–{to} of {data.total}
          {filter !== "all" || q ? ` matching (${data.grandTotal} total)` : ""}
        </p>
        {data.pageCount > 1 && (
          <div className="flex items-center gap-2">
            {data.page > 1 ? (
              <Link
                href={directoryHref(q, filter, data.page - 1)}
                className="border-[1.5px] border-ink/25 px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                Previous
              </Link>
            ) : null}
            <span className="text-sm tabular-nums text-ink-soft">
              {data.page} / {data.pageCount}
            </span>
            {data.page < data.pageCount ? (
              <Link
                href={directoryHref(q, filter, data.page + 1)}
                className="border-[1.5px] border-ink/25 px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                Next
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
