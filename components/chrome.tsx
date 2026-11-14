"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Check, HelpCircle, Menu, X } from "lucide-react";
import { LogoMark } from "./LogoMark";
import { Button } from "./ui";
import { cn } from "@/lib/util";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="UNLOAD home">
      <LogoMark className="text-ink-900" />
      <span className={cn("font-display text-lg font-extrabold tracking-tight", compact && "hidden sm:inline")}>
        UNLOAD
      </span>
    </Link>
  );
}

const NAV = [
  ["How it works", "/#how-it-works"],
  ["Pricing", "/pricing"],
  ["FAQ", "/#faq"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-17 max-w-[1200px] items-center justify-between px-4 sm:h-20 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-650 md:flex">
          {NAV.map(([l, h]) => (
            <Link key={h} href={h} className="hover:text-ink-900">
              {l}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <Button href="/upload">Start with photos</Button>
          </span>
          <button
            className="flex size-10 items-center justify-center rounded-xl border border-line md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-canvas px-4 pb-5 md:hidden">
          {NAV.map(([l, h]) => (
            <Link
              key={h}
              href={h}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-4 font-display text-lg font-bold"
            >
              {l}
            </Link>
          ))}
          <Button href="/upload" className="mt-5 w-full">
            Start with photos
          </Button>
        </div>
      )}
    </header>
  );
}

const STEPS = [
  ["Photos", "/upload"],
  ["Review", "/review"],
  ["Plan", "/plan"],
  ["Drafts", "/drafts"],
] as const;

export function StepProgress() {
  const path = usePathname();
  const current = STEPS.findIndex(([, h]) => path.startsWith(h));
  const active = current === -1 ? STEPS.length : current;
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Progress">
      {STEPS.map(([label, href], i) => {
        const done = i < active;
        const now = i === active;
        return (
          <li key={href} className="flex items-center gap-1.5 sm:gap-2">
            {i > 0 && <span className={cn("h-px w-3 sm:w-6", done || now ? "bg-ink-900" : "bg-line")} />}
            <Link
              href={done ? href : "#"}
              aria-current={now ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs font-semibold sm:text-sm",
                now && "bg-ink-900 text-white",
                done && "bg-lime-100 text-ink-900",
                !done && !now && "pointer-events-none text-ink-450",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] sm:size-6",
                  now && "bg-lime-400 text-ink-900",
                  done && "bg-lime-400 text-ink-900",
                  !done && !now && "border border-line",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn(!now && "hidden md:inline")}>{label}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-15 max-w-[1200px] items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <Logo compact />
        <StepProgress />
        <Link
          href="/#how-it-works"
          className="hidden items-center gap-1.5 text-sm font-medium text-ink-650 hover:text-ink-900 lg:flex"
        >
          <HelpCircle className="size-4" /> How this works
        </Link>
      </div>
    </header>
  );
}

/** Sticky bottom bar used by the flow screens. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 mt-auto border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-5">
        {children}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-ink-650">
            Turn a pile of unused things into organized listing drafts. Less listing. More living.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold tracking-widest text-ink-450">PRODUCT</p>
          {NAV.map(([l, h]) => (
            <Link key={h} href={h} className="block py-1 text-sm text-ink-650 hover:text-ink-900">
              {l}
            </Link>
          ))}
        </div>
        <div>
          <p className="mb-3 text-xs font-bold tracking-widest text-ink-450">LEGAL</p>
          <span className="block py-1 text-sm text-ink-650">Privacy</span>
          <span className="block py-1 text-sm text-ink-650">Terms</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 border-t border-line px-4 py-6 text-xs text-ink-450 sm:px-6 md:flex-row md:justify-between">
        <p>
          UNLOAD is not affiliated with eBay, Facebook Marketplace, Craigslist, or any resale platform. You
          post your listings yourself.
        </p>
        <p>© 2026 UNLOAD</p>
      </div>
    </footer>
  );
}
