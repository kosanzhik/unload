"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Bot,
  Handshake,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Plug,
  PlusCircle,
  Settings2,
  X,
} from "lucide-react";
import { LogoMark } from "./LogoMark";
import { Badge, timeAgo, ToastProvider } from "./ui";
import {
  checkAi,
  markAllRead,
  markNotificationRead,
  refreshIntegrations,
  syncMarketplaceThreads,
  useApp,
} from "@/lib/store";
import { cn } from "@/lib/util";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="UNLOAD home">
      <LogoMark />
      <span className={cn("font-display text-lg font-extrabold tracking-tight", dark && "text-white")}>
        UNLOAD <span className="font-semibold text-brand">Autopilot</span>
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products/new", label: "Add product", icon: PlusCircle },
  { href: "/inbox", label: "AI Inbox", icon: MessagesSquare, count: "inbox" },
  { href: "/deals", label: "Deal Center", icon: Handshake, count: "deals" },
  { href: "/marketplaces", label: "Marketplaces", icon: Plug },
  { href: "/settings", label: "Autopilot settings", icon: Settings2 },
] as const;

function useCounts() {
  const conversations = useApp((s) => s.conversations);
  const tasks = useApp((s) => s.tasks);
  const deals = useApp((s) => s.deals);
  return useMemo(
    () => ({
      inbox:
        conversations.reduce((n, c) => n + c.messages.filter((m) => m.status === "pending_approval").length, 0) +
        tasks.filter((t) => t.status === "open").length,
      deals: deals.filter((d) => d.approval === "pending").length,
    }),
    [conversations, tasks, deals],
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const counts = useCounts();
  return (
    <nav className="space-y-1">
      {NAV.map((n) => {
        const active = n.href === "/products/new" ? path === n.href : path.startsWith(n.href);
        const count = "count" in n ? counts[n.count] : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            <n.icon className="size-[18px]" />
            {n.label}
            {count > 0 && <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] text-white">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function AiStatus() {
  const ai = useApp((s) => s.ai);
  if (!ai.checked) return null;
  return (
    <div className="rounded-xl bg-white/5 p-3 text-xs text-white/70">
      <p className="flex items-center gap-2 font-semibold text-white">
        <Bot className="size-4" /> AI engine
      </p>
      <p className="mt-1">
        {ai.claude
          ? `Claude (${ai.model}) handles vision and wording. Policy rules always decide what may be said.`
          : "Demo mode: rule-based agent, no AI vision. Add ANTHROPIC_API_KEY to enable Claude."}
      </p>
    </div>
  );
}

function Bellbox() {
  const notifications = useApp((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative flex size-10 items-center justify-center rounded-xl border border-line bg-surface hover:border-ink-400"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="animate-rise absolute right-0 z-50 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display font-bold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-brand">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-500">You&apos;re all caught up.</li>}
            {notifications.slice(0, 30).map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => {
                    markNotificationRead(n.id);
                    setOpen(false);
                  }}
                  className={cn("block border-b border-line px-4 py-3 hover:bg-soft", !n.read && "bg-brand-50/50")}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {!n.read && <span className="size-2 shrink-0 rounded-full bg-brand" />}
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.body}</p>
                  <p className="mt-1 text-[11px] text-ink-400">{timeAgo(n.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Boot: AI status, integration status, and periodic sync with connected marketplaces. */
function useBoot() {
  const olx = useApp((s) => s.integrations.olx?.state);
  useEffect(() => {
    checkAi();
    refreshIntegrations();
  }, []);
  useEffect(() => {
    if (olx !== "connected") return;
    const run = () => syncMarketplaceThreads("olx").catch(() => {});
    run();
    const t = setInterval(run, 60_000);
    return () => clearInterval(t);
  }, [olx]);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useBoot();
  const [menu, setMenu] = useState(false);
  const path = usePathname();
  const title = NAV.find((n) => (n.href === "/products/new" ? path === n.href : path.startsWith(n.href)))?.label ?? (path.startsWith("/products") ? "Product" : "");

  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-navy p-4 lg:flex">
          <div className="px-2 pt-2">
            <Logo dark />
          </div>
          <NavLinks />
          <div className="mt-auto">
            <AiStatus />
          </div>
        </aside>

        {menu && (
          <div className="fixed inset-0 z-50 bg-ink-900/50 lg:hidden" onClick={() => setMenu(false)}>
            <aside className="animate-rise flex h-full w-72 flex-col gap-6 bg-navy p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-2 pt-2">
                <Logo dark />
                <button onClick={() => setMenu(false)} aria-label="Close menu" className="text-white/70">
                  <X className="size-5" />
                </button>
              </div>
              <NavLinks onNavigate={() => setMenu(false)} />
              <div className="mt-auto">
                <AiStatus />
              </div>
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6">
            <button
              onClick={() => setMenu(true)}
              aria-label="Open menu"
              className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <p className="truncate font-display text-lg font-bold">{title}</p>
            <div className="ml-auto flex items-center gap-2">
              <ModePill />
              <Bellbox />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1240px] min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

function ModePill() {
  const mode = useApp((s) => s.settings.mode);
  const label = { manual: "Manual", assisted: "Assisted", autopilot: "Autopilot" }[mode];
  return (
    <Link href="/settings" className="hidden sm:block" title="Automation mode">
      <Badge tone={mode === "autopilot" ? "brand" : "neutral"} dot>
        {label} mode
      </Badge>
    </Link>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-ink-500">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
