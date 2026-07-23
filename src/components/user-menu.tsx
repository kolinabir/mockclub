"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Shield,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoogleMark } from "@/components/google-mark";
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
            <Link href="/dashboard/admin" className="cursor-pointer">
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

/**
 * Signed-out affordance in the header.
 *
 * A bare person glyph said "account" without saying what tapping it does, and
 * gave no hint that signing in means Google — which is the whole of the auth
 * story here. The mark plus the word answers both before the click.
 *
 * Still a link to /sign-in rather than firing OAuth directly: that page carries
 * the "we only ask Google for your name and email" line, and sending someone to
 * a consent screen straight from a header button skips the promise.
 */
export function SignedOutIcon() {
  return (
    <Link
      href="/sign-in"
      className="inline-flex h-9 shrink-0 items-center gap-2 border border-ink/20 px-3 text-sm font-medium text-ink transition-colors hover:border-ink hover:text-vermilion-deep"
    >
      <GoogleMark className="size-4 shrink-0" />
      Login
    </Link>
  );
}
