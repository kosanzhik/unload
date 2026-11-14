"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  FlaskConical,
  Handshake,
  Loader2,
  MessagesSquare,
  PackagePlus,
  Radio,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { ProductBadge } from "@/components/status";
import { Badge, Button, Card, CardHeader, Empty, Thumb, timeAgo } from "@/components/ui";
import { money } from "@/lib/negotiation/policy";
import { loadDemoProduct, startDemoConversation, useApp, useHydrated } from "@/lib/store";
import { bundleSuggestions } from "@/lib/strategy/advisor";
import { cn } from "@/lib/util";

export default function Dashboard() {
  const hydrated = useHydrated();
  const router = useRouter();
  const products = useApp((s) => s.products);
  const listings = useApp((s) => s.listings);
  const conversations = useApp((s) => s.conversations);
  const deals = useApp((s) => s.deals);
  const tasks = useApp((s) => s.tasks);
  const notifications = useApp((s) => s.notifications);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const approvals = conversations.flatMap((c) => c.messages.filter((m) => m.status === "pending_approval").map((m) => ({ c, m })));
    const sold = deals.filter((d) => d.approval === "completed");
    return {
      approvals,
      active: listings.filter((l) => l.status === "active" || l.status === "moderation").length,
      exported: listings.filter((l) => l.status === "exported").length,
      aiReplies: conversations.reduce((n, c) => n + c.messages.filter((m) => m.role === "agent" && m.status === "sent").length, 0),
      openTasks: tasks.filter((t) => t.status === "open"),
      pendingDeals: deals.filter((d) => d.approval === "pending"),
      sold,
      updates: products.flatMap((p) => p.pendingListingUpdates.map((u) => ({ p, u }))),
    };
  }, [products, listings, conversations, deals, tasks]);
  const bundles = useMemo(() => bundleSuggestions(products), [products]);

  if (!hydrated) return null;

  async function tryDemo() {
    setLoading(true);
    const id = await loadDemoProduct();
    const cid = startDemoConversation(id);
    router.push(cid ? `/inbox?c=${cid}` : `/products/${id}`);
  }

  if (products.length === 0)
    return (
      <>
        <PageHeader title="Welcome to Autopilot" sub="Add an item, approve its listing, and let the agent handle buyers within your rules." />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-white">
              <PackagePlus className="size-5" />
            </span>
            <p className="mt-4 font-display text-xl font-bold">Add your first product</p>
            <p className="mt-1 text-sm text-ink-500">Upload photos, confirm the details, set your price rules, and choose where to sell.</p>
            <Button className="mt-5" href="/products/new">
              Add product <ArrowRight className="size-4" />
            </Button>
          </Card>
          <Card className="p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <FlaskConical className="size-5" />
            </span>
            <p className="mt-4 font-display text-xl font-bold">See the agent work in 30 seconds</p>
            <p className="mt-1 text-sm text-ink-500">
              Loads a sample monitor ($150, private minimum $130), publishes it to the simulated Demo Market and opens a scripted buyer chat. Everything is labeled Demo.
            </p>
            <Button className="mt-5" variant="secondary" onClick={tryDemo} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />} Run the demo workflow
            </Button>
          </Card>
        </div>
      </>
    );

  const tiles = [
    { label: "Products", value: products.filter((p) => p.status !== "sold").length, icon: Boxes, href: "#products" },
    { label: "Active listings", value: stats.active, sub: stats.exported ? `+${stats.exported} to post manually` : undefined, icon: Radio, href: "#products" },
    { label: "AI replies sent", value: stats.aiReplies, sub: `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`, icon: MessagesSquare, href: "/inbox" },
    { label: "Pending approvals", value: stats.approvals.length + stats.openTasks.length, icon: ShieldQuestion, href: "/inbox", hot: stats.approvals.length + stats.openTasks.length > 0 },
    { label: "Deal requests", value: stats.pendingDeals.length, icon: Handshake, href: "/deals", hot: stats.pendingDeals.length > 0 },
    { label: "Completed sales", value: stats.sold.length, sub: stats.sold.length ? summarizeSales(stats.sold) : undefined, icon: BadgeCheck, href: "/deals" },
  ];

  const attention = [
    ...stats.pendingDeals.map((d) => ({
      key: d.id,
      tone: "brand" as const,
      label: d.kind === "inspection" ? "Viewing request" : d.kind === "purchase" ? "Ready to buy" : "Offer",
      text: `${d.buyerRef} · ${money(d.offeredPrice, d.currency)} · ${products.find((p) => p.id === d.productId)?.title ?? ""}`,
      href: "/deals",
      at: d.createdAt,
    })),
    ...stats.approvals.map(({ c, m }) => ({
      key: m.id,
      tone: "warning" as const,
      label: "Approve reply",
      text: `${c.buyerRef}: “${m.text.slice(0, 70)}${m.text.length > 70 ? "…" : ""}”`,
      href: `/inbox?c=${c.id}`,
      at: m.createdAt,
    })),
    ...stats.openTasks.map((t) => ({
      key: t.id,
      tone: "warning" as const,
      label: "Verify",
      text: `${t.question} · ${products.find((p) => p.id === t.productId)?.title ?? ""}`,
      href: "/inbox?tab=tasks",
      at: t.createdAt,
    })),
    ...stats.updates.map(({ p, u }) => ({ key: u.id, tone: "neutral" as const, label: "Listing update", text: `${p.title}: “${u.text}”`, href: `/products/${p.id}`, at: p.createdAt })),
  ].sort((a, b) => b.at - a.at);

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub="What your agent is doing, and what needs you."
        action={
          <Button href="/products/new">
            <PackagePlus className="size-4" /> Add product
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={cn("rounded-2xl border bg-surface p-4 shadow-[var(--shadow-card)] transition hover:border-ink-400", t.hot ? "border-brand" : "border-line")}>
            <t.icon className={cn("size-5", t.hot ? "text-brand" : "text-ink-400")} />
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{t.value}</p>
            <p className="text-sm font-semibold text-ink-700">{t.label}</p>
            {t.sub && <p className="mt-0.5 truncate text-xs text-ink-500">{t.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Needs your attention" sub="Decisions only you can make." />
            {attention.length === 0 ? (
              <Empty icon={<Sparkles className="size-5" />} title="All clear" body="The agent is handling routine questions. You'll be notified when a buyer needs you." />
            ) : (
              <ul className="divide-y divide-line">
                {attention.slice(0, 8).map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-soft">
                      <Badge tone={a.tone} className="w-28 justify-center">
                        {a.label}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm">{a.text}</span>
                      <span className="hidden shrink-0 text-xs text-ink-400 sm:block">{timeAgo(a.at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="products">
            <CardHeader title="Products" sub={`${products.length} total`} />
            <ul className="divide-y divide-line">
              {products.map((p) => {
                const ls = listings.filter((l) => l.productId === p.id);
                const chats = conversations.filter((c) => c.productId === p.id).length;
                return (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-soft">
                      <Thumb src={p.photos[0]?.src} className="size-12 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{p.title || "Untitled"}</span>
                        <span className="block truncate text-xs text-ink-500">
                          {money(p.pricing.desired, p.pricing.currency)} · {ls.length} listing{ls.length === 1 ? "" : "s"} · {chats} chat{chats === 1 ? "" : "s"}
                          {p.demo && " · sample"}
                        </span>
                      </span>
                      <ProductBadge status={p.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Recent activity" />
            <ul className="divide-y divide-line">
              {notifications.length === 0 && <li className="p-5 text-sm text-ink-500">No activity yet.</li>}
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id}>
                  <Link href={n.href} className="block px-5 py-3 hover:bg-soft">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="truncate text-xs text-ink-500">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">{timeAgo(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          {bundles.length > 0 && (
            <Card>
              <CardHeader title="Strategy" sub="Heuristic suggestions across your items" />
              <ul className="divide-y divide-line">
                {bundles.map((b) => (
                  <li key={b.id} className="p-4">
                    <Badge>Heuristic</Badge>
                    <p className="mt-2 text-sm font-semibold">{b.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{b.body}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function summarizeSales(sold: { offeredPrice: number | null; currency: "USD" | "KZT" }[]) {
  const by: Record<string, number> = {};
  sold.forEach((d) => (by[d.currency] = (by[d.currency] ?? 0) + (d.offeredPrice ?? 0)));
  return Object.entries(by)
    .map(([c, v]) => money(v, c as "USD" | "KZT"))
    .join(" + ");
}
