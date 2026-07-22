import "server-only";

import type { Mail } from "@/server/email/transport";

/**
 * The two welcome emails, as data.
 *
 * Hand-written tables and inline styles rather than a component library,
 * because email clients are not browsers: Gmail strips <style> blocks entirely
 * and understands neither flexbox nor grid. Every rule that matters has to sit
 * on the element it styles.
 *
 * Each message ships both an HTML and a plain-text part. The text part is not a
 * courtesy — a message without one is a spam signal by itself, and it is what
 * screen readers and watch notifications actually read out.
 */

/** The member's name is user-supplied and lands inside markup. Escape it. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://mockclub.com";
  return `${base.replace(/\/+$/, "")}${path}`;
}

const INK = "#1f1b15";
const INK_SOFT = "#6b6357";
const BODY_INK = "#3a342b";
const PAPER = "#f7f4ec";
const PAPER_DEEP = "#ece5d6";
const VERMILION = "#c0442a";
const VERMILION_DEEP = "#a4361f";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/**
 * Shared chrome: preheader, masthead, body, footer.
 *
 * `preheader` is the grey line the inbox shows next to the subject. Left unset,
 * clients scrape whatever text comes first — usually the brand name, wasting
 * the one piece of copy that decides whether the mail gets opened. It is hidden
 * in the body with the standard zero-size + hidden-colour trick.
 */
function layout({
  preheader,
  body,
  footer,
}: {
  preheader: string;
  body: string;
  footer: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${PAPER_DEEP};">
<div style="display:none;font-size:1px;color:${PAPER_DEEP};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER_DEEP};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${PAPER};border:1px solid rgba(31,27,21,0.16);">
    <tr><td style="padding:30px 34px 0;">
      <span style="display:inline-block;width:9px;height:9px;background:${VERMILION};margin-right:8px;"></span><span style="font-family:${SERIF};font-size:19px;color:${INK};">MockClub</span>
    </td></tr>
    <tr><td style="padding:22px 34px 30px;font-family:${SANS};font-size:15px;line-height:1.6;color:${BODY_INK};">
${body}
    </td></tr>
    <tr><td style="height:1px;background:rgba(31,27,21,0.13);font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:18px 34px;background:${PAPER_DEEP};font-family:${SANS};font-size:12px;line-height:1.55;color:${INK_SOFT};">
${footer}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

const h1 = (text: string) =>
  `      <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:25px;line-height:1.12;font-weight:normal;color:${INK};">${text}</h1>`;

const p = (html: string) =>
  `      <p style="margin:0 0 13px;color:${BODY_INK};">${html}</p>`;

const button = (href: string, label: string) =>
  `      <p style="margin:22px 0 6px;"><a href="${href}" style="display:inline-block;background:${VERMILION_DEEP};color:#fbf8f1;text-decoration:none;font-weight:600;font-size:14.5px;padding:13px 24px;border:1px solid #7d2915;">${label}</a></p>`;

const label = (text: string) =>
  `      <p style="margin:0 0 8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8071;">${text}</p>`;

const REPLY_LINE = "Reply to this email and a human will read it.";

/** First name only, and never empty — "Hello, ." is worse than no name. */
function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

export function welcomeCandidate({ name }: { name: string }): Mail {
  const who = escapeHtml(firstName(name));
  const dashboard = appUrl("/dashboard");

  return {
    to: "",
    subject: "You're in — here's what happens next",
    html: layout({
      preheader:
        "Your profile is done. Nothing else is needed from you until booking opens.",
      body: [
        h1(`You're on the list, ${who}.`),
        p(
          "Your profile is done, which means when booking opens we can match you with someone who has actually interviewed for the role you're aiming at — in a language you're comfortable in, in your own timezone.",
        ),
        label("What happens next"),
        `      <ul style="margin:0 0 13px;padding-left:18px;color:${BODY_INK};">
        <li style="margin-bottom:5px;">Booking opens once enough interviewers have joined.</li>
        <li style="margin-bottom:5px;">You'll get one email when it does. That's the only one we'll send.</li>
        <li style="margin-bottom:5px;">Nothing is expected from you until then.</li>
      </ul>`,
        button(dashboard, "See your dashboard"),
      ].join("\n"),
      footer: `You're getting this because you signed up at mockclub.com. Free, always — the person across from you is a volunteer, not a vendor.<br>${REPLY_LINE}`,
    }),
    text: `You're on the list, ${firstName(name)}.

Your profile is done. When booking opens we can match you with someone who
has actually interviewed for the role you're aiming at, in a language you're
comfortable in, in your own timezone.

What happens next
- Booking opens once enough interviewers have joined.
- You'll get one email when it does. That's the only one we'll send.
- Nothing is expected from you until then.

See your dashboard: ${dashboard}

You're getting this because you signed up at mockclub.com.
${REPLY_LINE}`,
  };
}

export function welcomeInterviewer({ name }: { name: string }): Mail {
  const who = escapeHtml(firstName(name));
  const availability = appUrl("/dashboard/availability");

  return {
    to: "",
    subject: "Thank you — one thing left to do",
    html: layout({
      preheader:
        "Your profile is complete, but nobody can book you until you've set your hours.",
      body: [
        h1(`Thank you, ${who}. Now set your hours.`),
        p(
          "You're one of a small number of people offering to interview, and that's the side of this that's genuinely hard to find. One hour a month moves the queue more than you'd think.",
        ),
        p(
          "Your profile is complete, but nobody can book you until you've said when you're free. It takes about a minute — pick the days and hours that suit you, and mark any dates you can't make.",
        ),
        button(availability, "Set your hours"),
      ].join("\n"),
      footer: `You're getting this because you volunteered to interview at mockclub.com. You can pause your availability at any time, without explaining why.<br>${REPLY_LINE}`,
    }),
    text: `Thank you, ${firstName(name)}. Now set your hours.

You're one of a small number of people offering to interview, and that's the
side of this that's genuinely hard to find. One hour a month moves the queue
more than you'd think.

Your profile is complete, but nobody can book you until you've said when
you're free. It takes about a minute - pick the days and hours that suit you,
and mark any dates you can't make.

Set your hours: ${availability}

You're getting this because you volunteered to interview at mockclub.com.
You can pause your availability at any time, without explaining why.
${REPLY_LINE}`,
  };
}
