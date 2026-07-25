import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/session";
import { getMemberDetail } from "@/server/admin/member-detail";
import { INTERVIEW_TYPES, SEARCH_STAGES } from "@/content/candidate";
import { DISCIPLINES } from "@/content/skills";
import { OTHER_TRACK_SLUG, TRACKS } from "@/content/tracks";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Member · Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = {
  entry: "Entry / Junior",
  mid: "Mid-level",
  senior: "Senior",
  switcher: "Career switcher",
};

const LINK_LABEL: Record<string, string> = {
  website: "Website",
  linkedin: "LinkedIn",
  x: "X",
  github: "GitHub",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  other: "Link",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function Card({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-[1.5px] border-ink/15 bg-card">
      <header className="border-b border-ink/15 px-5 py-3">
        <h2 className="stamp-label text-[0.6875rem]">
          <span className="me-2.5 text-ink-soft">§ {n}</span>
          {title}
        </h2>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-1.5">
      <dt className="stamp-label shrink-0 text-[0.625rem] text-ink-soft">
        {label}
      </dt>
      <dd className="min-w-0 text-end text-sm font-medium">{value}</dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-[1.5px] border-ink/20 px-2.5 py-1 text-sm font-medium">
      {children}
    </span>
  );
}

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.isAdmin) redirect("/dashboard");

  const { id } = await params;
  const m = await getMemberDetail(id);
  if (!m) notFound();

  const p = m.profile;
  const trackName = p
    ? p.trackSlug === OTHER_TRACK_SLUG
      ? (p.customTrack ?? "Custom track")
      : (TRACKS.find((t) => t.slug === p.trackSlug)?.name ?? p.trackSlug)
    : null;
  const disciplineNames = (p?.disciplines ?? []).map(
    (slug) => DISCIPLINES.find((d) => d.slug === slug)?.name ?? slug,
  );
  const candidate = p?.candidate ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/admin/members"
        className="stamp-label inline-flex items-center gap-2 text-[0.6875rem] text-ink-soft transition-colors hover:text-vermilion-deep"
      >
        <ArrowLeft className="size-3.5 rtl:-scale-x-100" strokeWidth={2.5} />
        All members
      </Link>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold">
            {m.name}
          </h1>
          <p className="mt-1.5 text-ink-soft">{m.email}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {m.roles.map((r) => (
            <span
              key={r}
              className={cn(
                "stamp-label border-[1.5px] px-2.5 py-1.5 text-[0.625rem]",
                r === "interviewer"
                  ? "border-vermilion-deep text-vermilion-deep"
                  : "border-ink/25 text-ink-soft",
              )}
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <Card n="01" title="Profile">
          {p ? (
            <dl>
              {trackName && <Row label="Track" value={trackName} />}
              {p.level && (
                <Row label="Level" value={LEVEL_LABEL[p.level] ?? p.level} />
              )}
              <Row label="Time zone" value={p.timeZone} />
              {p.yearsOfExperience !== undefined && (
                <Row label="Years" value={String(p.yearsOfExperience)} />
              )}
              {p.currentRole && (
                <Row
                  label="Position"
                  value={`${p.currentRole.role} · ${p.currentRole.company}${p.currentRole.current ? "" : " (past)"}`}
                />
              )}
              <Row label="Last updated" value={longDate(p.updatedAt)} />
            </dl>
          ) : (
            <p className="text-sm text-ink-soft">No profile yet.</p>
          )}

          {(p?.languages?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="stamp-label text-[0.625rem] text-ink-soft">
                Languages
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p!.languages.map((l) => (
                  <Chip key={l}>{l}</Chip>
                ))}
              </div>
            </div>
          )}

          {disciplineNames.length > 0 && (
            <div className="mt-4">
              <p className="stamp-label text-[0.625rem] text-ink-soft">
                Areas
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {disciplineNames.map((d) => (
                  <Chip key={d}>{d}</Chip>
                ))}
              </div>
            </div>
          )}

          {(p?.skills?.length ?? 0) > 0 && (
            <div className="mt-4">
              <p className="stamp-label text-[0.625rem] text-ink-soft">
                Skills
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p!.skills!.map((sk) => (
                  <Chip key={sk}>{sk}</Chip>
                ))}
              </div>
            </div>
          )}
        </Card>

        {candidate && (
          <Card n="02" title="Candidate details">
            <dl>
              <Row
                label="Search stage"
                value={
                  SEARCH_STAGES.find((s) => s.slug === candidate.searchStage)
                    ?.label ?? candidate.searchStage
                }
              />
              <Row
                label="Interview types"
                value={candidate.interviewTypes
                  .map(
                    (t) =>
                      INTERVIEW_TYPES.find((it) => it.slug === t)?.label ?? t,
                  )
                  .join(", ")}
              />
              {candidate.jobTarget && (
                <Row label="Aiming at" value={candidate.jobTarget} />
              )}
            </dl>
            {candidate.focus && (
              <div className="mt-3">
                <p className="stamp-label text-[0.625rem] text-ink-soft">
                  Wants help with
                </p>
                <p className="mt-1.5 text-sm leading-relaxed">
                  {candidate.focus}
                </p>
              </div>
            )}
            {(candidate.cvUrl || candidate.jobUrl) && (
              <div className="mt-3 flex flex-wrap gap-4">
                {candidate.cvUrl && (
                  <a
                    href={candidate.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    CV ↗
                  </a>
                )}
                {candidate.jobUrl && (
                  <a
                    href={candidate.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Job posting ↗
                  </a>
                )}
              </div>
            )}
          </Card>
        )}

        <Card n={candidate ? "03" : "02"} title="Links">
          {(p?.links?.length ?? 0) > 0 ? (
            <ul className="space-y-2">
              {p!.links.map((l, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-6"
                >
                  <span className="stamp-label shrink-0 text-[0.625rem] text-ink-soft">
                    {LINK_LABEL[l.type] ?? l.type}
                  </span>
                  {/* Stored links passed normalizeLink at write time, so the
                      scheme is guaranteed http(s) — safe to render as href. */}
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-end text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {l.url.replace(/^https?:\/\//i, "")}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">No links.</p>
          )}
        </Card>

        {m.isInterviewer && (
          <Card n={candidate ? "04" : "03"} title="Availability">
            <dl>
              <Row
                label="Schedule zone"
                value={m.availability?.timeZone ?? "—"}
              />
              <Row label="Open hours" value={String(m.openSlots)} />
              <Row label="Paused" value={m.paused ? "Yes" : "No"} />
              <Row
                label="Bookable"
                value={
                  <span
                    className={
                      m.bookable
                        ? "font-medium text-olive"
                        : "font-medium text-vermilion-deep"
                    }
                  >
                    {m.bookable ? "Yes" : "No"}
                  </span>
                }
              />
            </dl>
            {(m.availability?.rules.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="stamp-label text-[0.625rem] text-ink-soft">
                  Rules
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {m.availability!.rules.map((r, i) => (
                    <li key={i} className="font-medium">
                      {r.date
                        ? `${r.date}${r.blocked ? " — blocked" : ""}`
                        : r.days.map((d) => DAY_NAMES[d]).join(", ")}{" "}
                      {!r.blocked && (
                        <span className="text-ink-soft">
                          {r.startTime}–{r.endTime}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        <Card
          n={String(2 + (candidate ? 1 : 0) + (m.isInterviewer ? 2 : 1)).padStart(2, "0")}
          title="Operations"
        >
          <dl>
            <Row
              label="Joined"
              value={m.createdAt ? longDate(m.createdAt) : "—"}
            />
            <Row
              label="Picked role"
              value={m.roleChosenAt ? longDate(m.roleChosenAt) : "—"}
            />
            <Row
              label="Onboarded"
              value={m.onboardedAt ? longDate(m.onboardedAt) : "—"}
            />
            <Row
              label="Welcome email"
              value={
                m.welcomeEmailSentAt ? (
                  longDate(m.welcomeEmailSentAt)
                ) : m.welcomeMissing ? (
                  <span className="font-medium text-vermilion-deep">
                    Not sent
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label="Profile"
              value={m.profileComplete ? "Complete" : "Incomplete"}
            />
          </dl>

          {!m.profileComplete && (
            <div className="mt-4">
              <p className="stamp-label text-[0.625rem] text-ink-soft">
                Missing
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {m.checklist
                  .filter((c) => !c.done)
                  .map((c) => (
                    <li key={c.key} className="text-ink-soft">
                      · {c.label}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
