import { permanentRedirect } from "next/navigation";

/**
 * The admin panel moved into the dashboard shell.
 *
 * Kept as a redirect rather than deleted: this URL is bookmarked, and it was
 * linked from the account menu for as long as it existed. No guard here on
 * purpose — the destination checks the role, and duplicating that check would
 * mean two places to get it wrong.
 */
export default function LegacyAdminPage() {
  permanentRedirect("/dashboard/admin");
}
