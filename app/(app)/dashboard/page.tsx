"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  Camera,
  CheckCircle2,
  FileText,
  FlaskConical,
  HandCoins,
  Loader2,
  MessageCircle,
  Radio,
  Send,
  ShieldQuestion,
  ThumbsDown,
  UserCheck,
} from "lucide-react";
import { OfferCard } from "@/components/offer-card";
import { ProductBadge } from "@/components/status";
import { Badge, Button, Card, CardHeader, Empty, Thumb, timeAgo } from "@/components/ui";
import type { ActivityKind } from "@/lib/core/types";
import { ADAPTERS } from "@/lib/marketplaces/registry";
import { money } from "@/lib/negotiation/policy";
import { loadSampleItem, startDemoConversation, useApp, useHydrated } from "@/lib/store";
import { GOALS } from "@/lib/strategy/engine";
import { cn } from "@/lib/util";

const ICON: Record<ActivityKind, typeof Bot> = {
  listing_prepared: FileText,
  publication_submitted: Send,
  published: Radio,
  publish_failed: AlertTriangle,
  question_answered: MessageCircle,
  reply_drafted: MessageCircle,
  counteroffer_sent: HandCoins,
  offer_received: HandCoins,
  approval_requested: UserCheck,
  question_for_seller: ShieldQuestion,
  deal_accepted: CheckCircle2,
  deal_rejected: ThumbsDown,
  sold: BadgeCheck,
};

export default function Dashboard() {
  const hydrated = useHydrated();
  const router = useRouter();
  const products = useApp((s) => s.products);
  const listings = useApp((s) => s.listings);
  const conversations = useApp((s) => s.conversations);
  const offers = useApp((s) => s.offers);
  const activity = useApp((s) => s.activity);
  const [loading, setLoading] = useState(false);

  const open = useMemo(() => offers.filter((o) => o.status === "pending" || o.status === "accepted"), [offers]);
  const stats = useMemo(
    () => ({
      selling: products.filter((p) => p.status === "selling").length,
      chats: conversations.filter((c) => c.messages.some((m) => m.role === "buyer")).length,
      waiting: offers.filter((o) => o.status === "pending").length,
      sold: products.filter((p) => p.status === "sold").length,
    }),
    [products, conversations, offers],
  );

  if (!hydrated) return null;

  async function demo() {
    setLoading(true);
    const id = await loadSampleItem("fast");
    const cid = startDemoConversation(id);
    router.push(cid ? `/inbox?c=${cid}` : `/items/${id}`);
  }

  if (products.length === 0)
    return (
      <div className="mx-auto max-w-3xl py-6 text-center sm:py-12">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
          <Bot className="size-6" />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">Your AI seller is ready.</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-500">Take a photo of something you don&apos;t need. Choose a goal. The AI does the selling and asks you only when it matters.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" href="/sell">
            <Camera className="size-4" /> Sell your first item
          </Button>
          <Button size="lg" variant="secondary" onClick={demo} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />} Watch a 2-minute demo sale
          </Button>
        </div>
        <p className="mt-4 text-xs text-ink-400">The demo uses a sample monitor on the built-in demo marketplace with a simulated buyer.</p>
      </div>
    );

  const tiles = [
    { label: "Selling", value: stats.selling, href: "#items" },
    { label: "Buyer chats", value: stats.chats, href: "/inbox" },
    { label: "Offers waiting", value: stats.waiting, href: "/inbox?tab=offers", hot: stats.waiting > 0 },
    { label: "Sold", value: stats.sold, href: "#items" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-ink-500">What your AI seller is doing right now.</p>
        </div>
        <Button href="/sell">
          <Camera className="size-4" /> Sell an item
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn("rounded-2xl border bg-surface p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5", t.hot ? "border-brand ring-1 ring-brand" : "border-line")}
          >
            <p className="font-display text-3xl font-extrabold tabular-nums">{t.value}</p>
            <p className={cn("text-sm font-semibold", t.hot ? "text-brand" : "text-ink-500")}>{t.label}</p>
          </Link>
        ))}
      </div>

      {open.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Buyer offers</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
            {open.slice(0, 4).map((o) => (
              <OfferCard key={o.id} o={o} compact />
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section id="items" className="scroll-mt-20">
          <h2 className="mb-3 text-lg font-bold">My items</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {products.map((p) => {
              const ls = listings.filter((l) => l.productId === p.id && l.status !== "draft");
              const chats = conversations.filter((c) => c.productId === p.id && c.messages.some((m) => m.role === "buyer")).length;
              const waiting = offers.filter((o) => o.productId === p.id && o.status === "pending").length;
              return (
                <Link key={p.id} href={`/items/${p.id}`} className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
                  <div className="relative">
                    <Thumb src={p.photos[0]?.src} className="aspect-[16/10] w-full rounded-none" />
                    <span className="absolute top-3 left-3 flex gap-1.5">
                      <ProductBadge status={p.status} />
                      {p.demo && <Badge tone="brand">Sample</Badge>}
                    </span>
                    {p.autopilot && p.status === "selling" && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-navy/90 px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Bot className="size-3" /> Autopilot
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="truncate font-display font-bold">{p.title}</p>
                    <p className="mt-0.5 text-sm text-ink-500">
                      {p.status === "sold" ? (
                        <b className="text-ink-900">Sold for {money(offers.find((o) => o.productId === p.id && o.status === "sold")?.price ?? p.pricing.desired, p.pricing.currency)}</b>
                      ) : (
                        <>
                          {money(p.pricing.desired, p.pricing.currency)} · {GOALS[p.goal].label}
                        </>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                      {ls.length === 0 && <span className="text-ink-400">Not listed yet</span>}
                      {ls.map((l) => (
                        <Badge key={l.id} tone={l.status === "error" ? "error" : l.status === "exported" ? "neutral" : "success"}>
                          {ADAPTERS[l.marketplace].name}
                        </Badge>
                      ))}
                      <span className="ml-auto text-ink-500">
                        {chats} chat{chats === 1 ? "" : "s"}
                        {waiting ? <b className="text-brand"> · {waiting} offer</b> : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <Card className="h-fit">
          <CardHeader icon={<Bot className="size-4" />} title="AI activity" sub="Everything here actually happened." />
          {activity.length === 0 ? (
            <Empty icon={<Bot className="size-5" />} title="Quiet so far" body="Listings, replies and offers will show up here." />
          ) : (
            <ol className="max-h-[560px] divide-y divide-line overflow-y-auto">
              {activity.slice(0, 40).map((a) => {
                const Icon = ICON[a.kind];
                const p = products.find((x) => x.id === a.productId);
                return (
                  <li key={a.id}>
                    <Link href={`/items/${a.productId}`} className="flex gap-3 px-5 py-3 hover:bg-soft">
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                          a.kind === "offer_received" || a.kind === "sold" ? "bg-success-50 text-success" : a.kind === "publish_failed" ? "bg-error-50 text-error" : "bg-brand-50 text-brand",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{a.text}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-400">
                          <span className="truncate">{p?.title}</span> · {timeAgo(a.at)}
                          {a.demo && <span className="rounded bg-brand-50 px-1 font-semibold text-brand-700">demo</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
      {products.every((p) => p.status !== "selling") && (
        <p className="mt-8 text-center text-sm text-ink-500">
          Nothing selling right now.{" "}
          <Link href="/sell" className="font-semibold text-brand">
            Sell another item <ArrowRight className="inline size-3.5" />
          </Link>
        </p>
      )}
    </>
  );
}
