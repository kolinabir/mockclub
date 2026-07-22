"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CircleUser,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
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
  useSidebar,
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

/**
 * Collapse control, on the sidebar itself.
 *
 * The header trigger works but lives across the page from the thing it moves.
 * This sits at the foot of the panel where the state actually changes, and it
 * survives collapsing — which is the whole point, since a control that
 * disappears when you use it can't undo itself.
 *
 * Desktop only: on mobile the sidebar is a sheet, and "collapse" is meaningless
 * there — you close it instead.
 */
function CollapseToggle() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  if (isMobile) return null;

  const collapsed = state === "collapsed";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex h-9 w-full items-center gap-2.5 px-2 text-ink-soft transition-colors hover:bg-sidebar-accent hover:text-ink group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <Icon className="size-4 shrink-0 rtl:-scale-x-100" strokeWidth={2} />
      <span className={`stamp-label text-[0.625rem] ${WHEN_EXPANDED}`}>
        Collapse
      </span>
    </button>
  );
}

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
          <SidebarGroupLabel>Your club</SidebarGroupLabel>
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
                    isActive={pathname === "/admin"}
                    tooltip="Waitlist"
                  >
                    <Link href="/admin">
                      <Shield />
                      <span>Waitlist</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to site">
                  <Link href="/">
                    <ArrowLeft className="rtl:-scale-x-100" />
                    <span>Back to site</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-0 border-t border-sidebar-border p-0">
        <div className="flex items-center gap-2.5 px-2 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="size-8 shrink-0 rounded-none border-[1.5px] border-ink">
            {/* no-referrer so loading an avatar doesn't tell the image host
                which dashboard page the user is on. Radix already falls back
                to initials if the load fails for any reason. */}
            <AvatarImage
              src={user.image ?? undefined}
              alt=""
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="rounded-none bg-paper-deep text-xs font-semibold text-ink">
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

        <CollapseToggle />
      </SidebarFooter>

      {/* Drag/click the panel edge to collapse — the affordance people expect
          from a desktop sidebar, and it costs nothing on mobile (not rendered). */}
      <SidebarRail />
    </Sidebar>
  );
}
