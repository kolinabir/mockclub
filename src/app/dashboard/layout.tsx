import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { UserMenu } from "@/components/user-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser } from "@/lib/session";
import { hasOnboarded } from "@/server/onboarding/onboarding";

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
  if (!(await hasOnboarded(user.id))) redirect("/onboarding");

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
            isAdmin: user.isAdmin,
            isInterviewer: user.isInterviewer,
          }}
        />

        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink/15 bg-paper/90 px-4 backdrop-blur-sm">
            <SidebarTrigger className="-ms-1" />
            <div className="ms-auto">
              <UserMenu
                name={user.name}
                email={user.email}
                image={user.image}
                isAdmin={user.isAdmin}
              />
            </div>
          </header>

          <div className="flex-1 px-4 py-8 sm:px-8 sm:py-10">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
