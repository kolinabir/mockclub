"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, CircleUser, LayoutDashboard, Shield } from "lucide-react";

import { Logo } from "@/components/logo";
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
} from "@/components/ui/sidebar";

export type SidebarUser = {
  name: string;
  email: string;
  isAdmin: boolean;
  isInterviewer: boolean;
};

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1.5">
          <Logo className="size-7 shrink-0 text-ink" />
          <span className="display truncate text-xl font-semibold group-data-[collapsible=icon]:hidden">
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
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-ink-soft">{user.email}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
