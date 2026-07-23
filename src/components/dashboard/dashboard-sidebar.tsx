"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CircleUser,
  LayoutDashboard,
  Shield,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export type SidebarUser = {
  name: string;
  email: string;
  image?: string | null;
  isAdmin: boolean;
  isInterviewer: boolean;
};

/** Hidden whenever the sidebar is collapsed to icons. */
const WHEN_EXPANDED = "group-data-[collapsible=icon]:hidden";

export function DashboardSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  const main = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "Profile", icon: CircleUser },
  ];

  // Availability only means something for people who give hours.
  if (user.isInterviewer) {
    main.push({
      href: "/dashboard/availability",
      label: "Availability",
      icon: CalendarClock,
    });
  }

  const initials =
    user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border p-0">
        <Link
          href="/"
          title="Back to site"
          className="group/logo flex h-14 items-center gap-2.5 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Logo className="size-7 shrink-0 text-ink transition-transform group-hover/logo:-rotate-6" />
          <span
            className={`display truncate text-xl font-semibold ${WHEN_EXPANDED}`}
          >
            MockClub
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/admin"}
                    tooltip="Admin"
                  >
                    <Link href="/dashboard/admin">
                      <Shield />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>

      {/* Footer carries exactly one thing: who is signed in. Leaving the
          dashboard is the logo's job (top), collapsing is the header trigger's
          and the rail's — stacking those here read as clutter. */}
      <SidebarFooter className="gap-0 border-t border-sidebar-border p-0">
        <div className="flex items-center gap-2.5 px-3 py-3.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="size-8 shrink-0 rounded-none">
            {/* no-referrer so loading an avatar doesn't tell the image host
                which dashboard page the user is on. Radix already falls back
                to initials if the load fails for any reason. */}
            <AvatarImage
              src={user.image ?? undefined}
              alt=""
              referrerPolicy="no-referrer"
            />
            {/* Inverted-panel fallback: paper-deep initials would vanish on
                the paper-deep sidebar now that the border is gone. */}
            <AvatarFallback className="rounded-none bg-panel text-xs font-semibold text-panel-fg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={`min-w-0 ${WHEN_EXPANDED}`}>
            <p className="truncate text-sm font-medium leading-tight">
              {user.name}
            </p>
            <p className="truncate text-xs leading-tight text-ink-soft">
              {user.email}
            </p>
          </div>
        </div>
      </SidebarFooter>

      {/* Drag/click the panel edge to collapse — the affordance people expect
          from a desktop sidebar, and it costs nothing on mobile (not rendered). */}
      <SidebarRail />
    </Sidebar>
  );
}
