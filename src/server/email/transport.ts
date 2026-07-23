import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

/**
 * One cached SMTP transport for the whole app.
 *
 * Same reasoning as the Mongo client: Next instantiates modules many times
 * across dev HMR and serverless invocations, and a fresh transport per call
 * means a fresh TCP + TLS handshake to Google on every email. Nodemailer pools
 * connections, so it is worth exactly one instance.
 *
 * Framework-free on purpose — no `next/*` import — per the server/ boundary.
 */

const globalForMail = globalThis as unknown as {
  _mailTransport?: Transporter;
};

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  replyTo?: string;
};

/**
 * Reads the SMTP settings, or null when they're absent.
 *
 * Null rather than throwing: mail is never load-bearing here. A developer with
 * no SMTP credentials should be able to run the whole signup flow, and see in
 * the log that an email would have gone out, rather than hit a crash in a
 * feature they weren't working on.
 */
export function mailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from || !Number.isFinite(port)) return null;

  return {
    host,
    port,
    user,
    pass,
    from,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
  };
}

/** `MockClub <contact@mockclub.com>` -> `contact@mockclub.com`. */
function addressOf(from: string): string {
  return from.match(/<([^>]+)>/)?.[1] ?? from.trim();
}

function transport(config: MailConfig): Transporter {
  if (!globalForMail._mailTransport) {
    globalForMail._mailTransport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
      // Getting this backwards hangs the connection rather than erroring.
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
      // Reuse connections across a burst rather than reconnecting per message.
      pool: true,
      maxConnections: 2,
    });
  }
  return globalForMail._mailTransport;
}

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "failed" };

/**
 * Send one message. Never throws.
 *
 * Callers sit on paths — finishing onboarding, volunteering — where the user's
 * real work has already committed. A dead SMTP host must not turn a completed
 * signup into an error, so the failure is reported as a value and the caller
 * decides (in practice: log it and carry on).
 */
export async function sendMail(mail: Mail): Promise<SendResult> {
  const config = mailConfig();
  if (!config) {
    // Loud in development, harmless in production. No message body here — it
    // contains the member's name and address.
    console.warn(`[email] SMTP not configured; skipped "${mail.subject}"`);
    return { ok: false, reason: "not-configured" };
  }

  // The address people would actually reach a human on.
  const contact = config.replyTo ?? addressOf(config.from);

  try {
    await transport(config).sendMail({
      from: config.from,
      to: mail.to,
      replyTo: config.replyTo,
      subject: mail.subject,
      // Both parts, always. A message with no plain-text alternative is a spam
      // signal on its own, and it's what screen readers actually read.
      text: mail.text,
      html: mail.html,
      headers: {
        // Gmail requires this only of bulk senders, and everything we send is
        // transactional — but its presence is a trust signal, and it gives
        // Gmail's own "Unsubscribe" control something to point at instead of
        // leaving "Report spam" as the only visible way out.
        //
        // mailto only, deliberately: List-Unsubscribe-Post promises a one-click
        // HTTP endpoint that honours POST, and claiming that without building
        // it is worse than not offering it.
        "List-Unsubscribe": `<mailto:${contact}?subject=unsubscribe>`,
      },
    });
    return { ok: true };
  } catch (err) {
    // Never log the config or the recipient — this line ends up in hosting
    // logs. The subject is enough to identify which send failed.
    console.error(
      `[email] send failed for "${mail.subject}":`,
      err instanceof Error ? err.message : "unknown error",
    );
    return { ok: false, reason: "failed" };
  }
}

/**
 * Prove the credentials work, without sending anything.
 *
 * Useful as a one-off check after changing App Passwords: an auth failure here
 * is immediate and explicit, where the same failure at send time is a line in a
 * log nobody reads.
 */
export async function verifyMailConnection(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const config = mailConfig();
  if (!config) return { ok: false, error: "SMTP is not configured." };
  try {
    await transport(config).verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}
