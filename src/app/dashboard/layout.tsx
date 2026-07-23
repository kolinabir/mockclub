import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser } from "@/lib/session";
import { hasOnboarded } from "@/server/onboarding/onboarding";

/**
 * Everything under /dashboard is behind the auth guard below, so a crawler only
 * ever gets the redirect to /sign-in — there is nothing here to rank, and a
 * member's availability or admin queue must never end up in a search result.
 *
 * Declared on the layout, not on each page, so a new route added later inherits
 * it instead of leaking because someone forgot the line. Individual pages still
 * set their own `title`; those merge over this.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard here so every /dashboard/* route inherits it — but each page still
  // re-reads the session, because a layout is not a security boundary on its own.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // New members choose candidate/interviewer once before the dashboard makes
  // any sense — the whole UI branches on that answer.
  //
  // Admins are exempt. Onboarding builds a MEMBER profile — track, level,
  // skills, public links — and an operator account has no use for one; being
  // forced through four steps about which interviews you can run, just to reach
  // the waitlist, is the wrong ask. An admin who also wants to take part can
  // still walk /onboarding deliberately once they hold a member role.
  if (!user.isAdmin && !(await hasOnboarded(user.id))) redirect("/onboarding");

  return (
    // SidebarMenuButton renders a Tooltip when collapsed to icons, but this
    // version of shadcn's SidebarProvider does not mount a TooltipProvider —
    // so the tooltip throws on render. Wrapping here keeps ui/ untouched.
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <DashboardSidebar
          user={{
            name: user.name,
            email: user.email,
            image: user.image,
            isAdmin: user.isAdmin,
            isInterviewer: user.isInterviewer,
          }}
        />

        <SidebarInset>
          {/* Same construction as the marketing header (sticky, hairline rule,
              translucent paper) so crossing into the dashboard doesn't feel
              like a different product. */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink/15 bg-paper/90 px-4 backdrop-blur-sm sm:px-6">
            {/* The one collapse/expand control. It lives here — outside the
                panel it moves — so it survives collapsing on desktop, and on
                mobile it is what opens the sheet. The rail on the panel edge
                is the secondary affordance. */}
            <SidebarTrigger className="-ms-1 size-9 rounded-none border border-ink/20 text-ink hover:border-ink hover:bg-transparent" />
            {/* The dashboard has its own header, so it needs its own toggle:
                the marketing ThemeToggle lives in header-nav and never renders
                here, leaving dark mode unreachable on every /dashboard route. */}
            <div className="ms-auto flex items-center gap-2">
              <ThemeToggle />
              <UserMenu
                name={user.name}
                email={user.email}
                image={user.image}
                isAdmin={user.isAdmin}
              />
            </div>
          </header>

          {/* min-w-0 matters: without it a wide child (a table, a long code
              string) makes the whole inset grow and the page scrolls sideways
              instead of the child doing so. */}
          <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
