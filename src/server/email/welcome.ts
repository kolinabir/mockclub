import "server-only";

import { sendMail } from "@/server/email/transport";
import {
  welcomeCandidate,
  welcomeInterviewer,
} from "@/server/email/templates";
import type { MemberRole } from "@/server/profile/profile";
import { userFilter, users } from "@/server/users/users";

/**
 * The one welcome email, sent once.
 *
 * Claimed with a guarded `findOneAndUpdate` rather than read-then-write, for
 * the same reason booking claims a slot that way: server actions are public
 * endpoints, and two requests arriving together would otherwise both read "not
 * sent yet" and both send. A `null` result means somebody already claimed it.
 *
 * The marker is released again if the send fails, so a transient SMTP outage
 * costs a retry rather than the email.
 */
export async function sendWelcomeEmail(
  userId: string,
  role: MemberRole,
): Promise<void> {
  const filter = userFilter(userId);
  if (!filter) return;

  const claimed = await users().findOneAndUpdate(
    { ...filter, welcomeEmailSentAt: { $exists: false } },
    { $set: { welcomeEmailSentAt: new Date() } },
    { returnDocument: "after", projection: { name: 1, email: 1 } },
  );

  // Already sent, or no such user. Either way there is nothing to do.
  if (!claimed?.email) return;

  const mail =
    role === "interviewer"
      ? welcomeInterviewer({ name: claimed.name ?? "" })
      : welcomeCandidate({ name: claimed.name ?? "" });

  const result = await sendMail({ ...mail, to: claimed.email });

  if (!result.ok) {
    // Hand the claim back. Without this, one failed send means the member
    // never gets a welcome at all — the marker would say it had been sent.
    await users()
      .updateOne(filter, { $unset: { welcomeEmailSentAt: "" } })
      .catch(() => {});
  }
}
