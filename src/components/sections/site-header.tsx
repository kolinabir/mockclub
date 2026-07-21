"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_LINKS } from "@/content/nav";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/15 bg-paper/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo className="size-8 shrink-0 text-ink transition-transform group-hover:-rotate-6" />
          <span className="display text-xl font-semibold tracking-tight sm:text-2xl">
            MockClub
          </span>
          <span className="stamp-label hidden text-ink-soft lg:inline">
            est. 2026
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="stamp-label text-ink-soft transition-colors hover:text-vermilion"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            asChild
            className="hidden rounded-none border-[1.5px] border-ink bg-ink font-medium text-paper shadow-[3px_3px_0_0_var(--vermilion)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-ink hover:shadow-[5px_5px_0_0_var(--vermilion)] sm:inline-flex"
          >
            <Link href="#join">Get an invite</Link>
          </Button>

          {/* Mobile menu — below md the links above are hidden entirely */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex size-9 items-center justify-center border border-ink/20 text-ink transition-colors hover:border-ink md:hidden"
              >
                <Menu className="size-4" strokeWidth={2} />
              </button>
            </SheetTrigger>

            {/* shadcn's Sheet takes physical sides only. Its internals use
                logical borders, but the panel edge itself does not flip — so
                in RTL this opens from the start side. Acceptable until
                translations ship; revisit with the i18n work. */}
            <SheetContent side="right" className="w-[min(20rem,85vw)] bg-paper">
              <SheetHeader className="border-b border-ink/15">
                <SheetTitle className="flex items-center gap-2.5">
                  <Logo className="size-7 text-ink" />
                  <span className="display text-xl font-semibold">MockClub</span>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-1 p-4">
                {NAV_LINKS.map(({ label, href }) => (
                  <SheetClose asChild key={href}>
                    <Link
                      href={href}
                      className="display border-b border-ink/10 py-4 text-2xl font-semibold transition-colors hover:text-vermilion"
                    >
                      {label}
                    </Link>
                  </SheetClose>
                ))}

                <SheetClose asChild>
                  <Link
                    href="#join"
                    className="press mt-6 bg-vermilion px-6 py-4 text-center text-base font-medium text-white dark:bg-vermilion-strong"
                  >
                    Get an invite
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
