"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Shield,
  User as UserIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";

export type UserMenuProps = {
  name: string;
  email: string;
  image?: string | null;
  isAdmin: boolean;
};

export function UserMenu({ name, email, image, isAdmin }: UserMenuProps) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-ink/25 bg-card transition-colors hover:border-ink"
        >
          {image && !imageFailed ? (
            // Google avatars are remote; plain <img> avoids next/image host config.
            //
            // referrerPolicy is a privacy measure, not a fix: without it every
            // avatar load tells Google which dashboard URL the user is on.
            //
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="size-full object-cover"
            />
          ) : (
            // A plain <img> has no fallback of its own — without this, any
            // failure (revoked avatar, offline, rate limit) shows a broken icon
            // rather than the initial.
            <span className="text-sm font-medium">{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 rounded-none">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium">{name}</p>
          <p className="truncate text-xs text-ink-soft">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="size-4" /> Dashboard
          </Link>
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="cursor-pointer">
              <Shield className="size-4" /> Admin
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={async () => {
            await signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SignedOutIcon() {
  return (
    <Link
      href="/sign-in"
      aria-label="Sign in"
      className="inline-flex size-9 shrink-0 items-center justify-center border border-ink/20 text-ink-soft transition-colors hover:border-ink hover:text-vermilion-deep"
    >
      <UserIcon className="size-4" strokeWidth={2} />
    </Link>
  );
}
