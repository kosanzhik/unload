"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bot, ClipboardCopy, Download, ExternalLink, Lightbulb, Lock, MessageSquarePlus, Plus, RefreshCw, Rocket, ShieldCheck, Store, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { DetailsForm } from "@/components/product-forms";
import { ListingBadge, MarketplaceBadge, ProductBadge } from "@/components/status";
import { Badge, Button, Card, CardHeader, Empty, Help, Label, Modal, Segmented, Thumb, useToast } from "@/components/ui";
import type { Goal, Listing, MarketplaceId, Product } from "@/lib/core/types";
import { listingAsText } from "@/lib/listing/drafts";
import { ADAPTERS, MARKETPLACE_ORDER } from "@/lib/marketplaces/registry";
import { counterFor, money } from "@/lib/negotiation/policy";
import {
  addFact,
  deleteItem,
  dismissTip,
  makeFact,
  markPostedManually,
  prepareListings,
  publishListing,
  refreshListing,
  removeFact,
  removeListing,
  setListingAvailability,
  setPrice,
  startDemoConversation,
  syncListingText,
  updateItem,
  useApp,
  useHydrated,
} from "@/lib/store";
import { GOAL_ORDER, GOALS, strategyTips } from "@/lib/strategy/engine";
import { cn } from "@/lib/util";

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const products = useApp((s) => s.products);
  const p = products.find((x) => x.id === id);
  if (!hydrated) return null;
  if (!p)
    return (
      <Card>
        <Empty icon={<Store className="size-5" />} title="Item not found" body="It may have been deleted." action={<Button href="/dashboard">Back to dashboard</Button>} />
      </Card>
    );
  return <ItemView p={p} />;
}

function ItemView({ p }: { p: Product }) {
  const router = useRouter();
  const allListings = useApp((s) => s.listings);
  const listings = useMemo(() => allListings.filter((l) => l.productId === p.id), [allListings, p.id]);
  const mockLive = listings.some((l) => l.marketplace === "mock" && l.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title || "Untitled item"}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <ProductBadge status={p.status} />
            <span>
              {money(p.pricing.desired, p.pricing.currency)} · {GOALS[p.goal].label}
            </span>
            {p.demo && <Badge tone="brand">Sample</Badge>}
          </span>
        }
        action={
          <>
            {mockLive && p.status !== "sold" && (
              <Button
                variant="secondary"
                onClick={() => {
                  const cid = startDemoConversation(p.id);
                  if (cid) router.push(`/inbox?c=${cid}`);
                }}
              >
                <MessageSquarePlus className="size-4" /> Simulate a demo buyer
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Delete this item and its conversations from UNLOAD? Live listings on marketplaces are not removed.")) {
                  deleteItem(p.id);
                  router.push("/dashboard");
                }
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <AutopilotCard p={p} />
          <TipsCard p={p} />
          <ListingsCard p={p} listings={listings} />
          <KnowledgeCard p={p} />
          <DetailsCard p={p} />
        </div>
        <div className="space-y-6">
          <Card className="p-4">
            <Thumb src={p.photos[0]?.src} className="aspect-square w-full" alt={p.title} />
            {p.photos.length > 1 && (
              <div className="mt-3 flex gap-2">
                {p.photos.slice(1, 5).map((ph) => (
                  <Thumb key={ph.id} src={ph.src} className="size-14" />
                ))}
              </div>
            )}
          </Card>
          <PriceCard p={p} />
        </div>
      </div>
    </div>
  );
}

function AutopilotCard({ p }: { p: Product }) {
  const sold = p.status === "sold";
  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center", p.autopilot && !sold ? "bg-navy text-white" : "border border-line bg-surface")}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", p.autopilot && !sold ? "bg-brand text-white" : "bg-soft text-ink-500")}>
        <Bot className="size-5" />
      </span>
      <div className="flex-1">
        <p className="font-display text-lg font-bold">{sold ? "Sold — the AI is done here" : p.autopilot ? "Autopilot is on" : "Autopilot is off"}</p>
        <p className={cn("text-sm", p.autopilot && !sold ? "text-white/70" : "text-ink-500")}>
          {sold
            ? "Listings were ended where the marketplace allows it."
            : p.autopilot
              ? `Answers buyers from what you confirmed and negotiates inside your range (${GOALS[p.goal].label}). You approve every deal.`
              : "The AI drafts every reply and waits for your OK before sending."}
        </p>
      </div>
      {!sold && (
        <Button variant={p.autopilot ? "secondary" : "primary"} onClick={() => updateItem(p.id, { autopilot: !p.autopilot })}>
          {p.autopilot ? "Pause" : "Turn on Autopilot"}
        </Button>
      )}
    </div>
  );
}

function TipsCard({ p }: { p: Product }) {
  const toast = useToast();
  const listings = useApp((s) => s.listings);
  const conversations = useApp((s) => s.conversations);
  const offers = useApp((s) => s.offers);
  const tips = useMemo(() => strategyTips(p, listings, conversations, offers), [p, listings, conversations, offers]);
  if (!tips.length) return null;
  return (
    <Card>
      <CardHeader icon={<Lightbulb className="size-4" />} title="Your AI seller suggests" sub={`${GOALS[p.goal].label} strategy · based on your real listing activity`} />
      <ul className="divide-y divide-line">
        {tips.map((t) => (
          <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
            <span className={cn("mt-0.5 size-2 shrink-0 rounded-full max-sm:hidden", t.tone === "good" ? "bg-success" : t.tone === "warn" ? "bg-warning" : "bg-brand")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-sm text-ink-500">{t.body}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {t.action?.type === "set_price" && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => dismissTip(p.id, t.id)}>
                    Keep price
                  </Button>
                  <Button size="sm" onClick={() => setPrice(p.id, (t.action as { price: number }).price).then(() => toast("Price updated on your listings"))}>
                    {t.action.label}
                  </Button>
                </>
              )}
              {t.action?.type === "open" && (
                <Button size="sm" variant="secondary" href={t.action.href}>
                  {t.action.label}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- Price & goal ---------------- */

function PriceCard({ p }: { p: Product }) {
  const toast = useToast();
  const [goal, setGoal] = useState<Goal>(p.goal);
  const [desired, setDesired] = useState(String(p.pricing.desired ?? ""));
  const [minimum, setMinimum] = useState(String(p.pricing.minimum ?? ""));
  const d = desired.trim() ? Number(desired) : null;
  const m = minimum.trim() ? Number(minimum) : null;
  const err = d == null ? "Set an asking price." : m != null && m > d ? "Minimum can't be above the asking price." : null;
  const dirty = goal !== p.goal || d !== p.pricing.desired || m !== p.pricing.minimum;
  const counter = !err ? counterFor({ ...p.pricing, desired: d, minimum: m }, goal) : null;
  return (
    <Card id="pricing">
      <CardHeader title="Goal & price" />
      <div className="space-y-4 p-5">
        <Segmented<Goal> className="w-full" value={goal} onChange={setGoal} options={GOAL_ORDER.map((g) => ({ value: g, label: GOALS[g].label.replace("Get More Money", "More money") }))} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pd">Asking</Label>
            <input id="pd" inputMode="decimal" className="field" value={desired} onChange={(e) => setDesired(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div>
            <Label htmlFor="pm" hint={<Lock className="size-3" />}>
              Minimum
            </Label>
            <input id="pm" inputMode="decimal" className="field" value={minimum} onChange={(e) => setMinimum(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
        </div>
        {err ? <p className="text-xs font-medium text-error">{err}</p> : <Help>A lowball offer gets countered at {money(counter, p.pricing.currency)}. Your minimum is never shown.</Help>}
        <Button
          className="w-full"
          disabled={!dirty || Boolean(err)}
          onClick={async () => {
            updateItem(p.id, { goal });
            await setPrice(p.id, d!, m);
            toast("Saved");
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Listings ---------------- */

function ListingsCard({ p, listings }: { p: Product; listings: Listing[] }) {
  const integrations = useApp((s) => s.integrations);
  const [add, setAdd] = useState<MarketplaceId | "">("");
  const missing = MARKETPLACE_ORDER.filter((m) => !listings.some((l) => l.marketplace === m));
  return (
    <Card id="listings">
      <CardHeader
        icon={<Store className="size-4" />}
        title="Where it's listed"
        action={
          missing.length > 0 && p.status !== "sold" && (
            <div className="flex gap-2">
              <select aria-label="Add marketplace" className="field h-9 w-40 py-1" value={add} onChange={(e) => setAdd(e.target.value as MarketplaceId)}>
                <option value="">Add marketplace…</option>
                {missing.map((m) => (
                  <option key={m} value={m}>
                    {ADAPTERS[m].name}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary" aria-label="Add" disabled={!add} onClick={() => (prepareListings(p.id, [add as MarketplaceId]), setAdd(""))}>
                <Plus className="size-4" />
              </Button>
            </div>
          )
        }
      />
      {listings.length === 0 ? (
        <Empty icon={<Store className="size-5" />} title="Not listed yet" body="Add a marketplace to create a listing tailored to it." />
      ) : (
        <ul className="divide-y divide-line">
          {listings.map((l) => (
            <ListingRow key={l.id} l={l} p={p} state={integrations[l.marketplace]?.state} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ListingRow({ l, p, state }: { l: Listing; p: Product; state?: string }) {
  const toast = useToast();
  const a = ADAPTERS[l.marketplace];
  const [posted, setPosted] = useState(false);
  const [url, setUrl] = useState("");
  const live = l.status === "active" || l.status === "moderation";
  const canPublish = (l.status === "draft" || l.status === "error") && (!a.capabilities.publish || l.marketplace === "mock" || state === "connected");
  const text = listingAsText({ ...p, title: l.title, description: l.description }, l.marketplace);

  return (
    <li className="p-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{a.name}</p>
        {l.marketplace === "mock" && <Badge tone="brand">Demo</Badge>}
        <ListingBadge status={l.status} />
        {l.views != null && <span className="text-xs text-ink-500">{l.views} views</span>}
        {l.url && (
          <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            Open <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <p className="mt-1 truncate text-sm text-ink-700">
        {l.title} · {money(l.price, l.currency)}
      </p>
      {l.note && <p className={cn("mt-1 text-xs", l.status === "error" ? "text-error" : "text-ink-500")}>{l.note}</p>}
      {a.capabilities.publish && l.marketplace !== "mock" && state !== "connected" && l.status === "draft" && (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-500">
          <MarketplaceBadge state={state as never} />
          <Link href="/marketplaces" className="font-semibold text-brand">
            Connect {a.name} to publish
          </Link>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {canPublish && (
          <Button size="sm" onClick={() => publishListing(l.id)}>
            <Rocket className="size-4" /> {a.capabilities.publish ? "Publish" : "Prepare to post"}
          </Button>
        )}
        {!a.capabilities.publish && (
          <>
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(text).then(() => toast("Listing copied"))}>
              <ClipboardCopy className="size-4" /> Copy
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const u = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
                const el = document.createElement("a");
                el.href = u;
                el.download = `${a.id}-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.txt`;
                el.click();
                setTimeout(() => URL.revokeObjectURL(u), 1000);
              }}
            >
              <Download className="size-4" /> Download
            </Button>
          </>
        )}
        {l.status === "exported" && (
          <Button size="sm" variant="secondary" onClick={() => setPosted(true)}>
            I posted it
          </Button>
        )}
        {live && a.capabilities.readStatus && l.marketplace !== "mock" && (
          <Button size="sm" variant="ghost" onClick={() => refreshListing(l.id).then(() => toast("Status refreshed"))}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        )}
        {live && a.capabilities.availability && (
          <Button size="sm" variant="ghost" onClick={() => setListingAvailability(l.id, false)}>
            Pause listing
          </Button>
        )}
        {l.status === "inactive" && a.capabilities.availability && (
          <Button size="sm" variant="ghost" onClick={() => setListingAvailability(l.id, true)}>
            Reactivate
          </Button>
        )}
        {l.status === "draft" && (
          <Button size="sm" variant="ghost" onClick={() => removeListing(l.id)}>
            Remove
          </Button>
        )}
      </div>
      <Modal open={posted} onClose={() => setPosted(false)} title={`Posted on ${a.name}?`}>
        <Label htmlFor="posted-url" hint="optional">
          Link to your listing
        </Label>
        <input id="posted-url" className="field" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Help>UNLOAD can&apos;t read {a.name} messages. Paste buyer messages into the AI Inbox to get replies that follow your rules.</Help>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => (markPostedManually(l.id, url), setPosted(false))}>Mark as posted</Button>
        </div>
      </Modal>
    </li>
  );
}

/* ---------------- What the AI knows ---------------- */

function KnowledgeCard({ p }: { p: Product }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  return (
    <Card id="knowledge">
      <CardHeader icon={<ShieldCheck className="size-4" />} title="What the AI knows" sub="Buyers get answers only from these facts and your listing. Anything else comes to you." />
      <ul className="divide-y divide-line">
        {p.facts.length === 0 && <li className="px-5 py-4 text-sm text-ink-500">Nothing confirmed yet — the AI will ask you when buyers have questions.</li>}
        {p.facts.map((f) => (
          <li key={f.id} className="flex items-start gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-500">{f.question}</p>
              <p className="text-sm">{f.answer}</p>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              <input
                type="checkbox"
                className="accent-brand"
                checked={f.inListing}
                onChange={(e) => {
                  updateItem(p.id, { facts: p.facts.map((x) => (x.id === f.id ? { ...x, inListing: e.target.checked } : x)) });
                  syncListingText(p.id);
                }}
              />
              In listing
            </label>
            <button aria-label="Remove fact" onClick={() => removeFact(p.id, f.id)} className="text-ink-400 hover:text-error">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="grid gap-2 border-t border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:px-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim() || !a.trim()) return;
          addFact(p.id, makeFact(q.trim().toLowerCase().slice(0, 40), q.trim(), a.trim()));
          setQ("");
          setA("");
        }}
      >
        <input aria-label="Question" className="field" placeholder="e.g. Does it come with the box?" value={q} onChange={(e) => setQ(e.target.value)} />
        <input aria-label="Answer" className="field" placeholder="Your answer" value={a} onChange={(e) => setA(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!q.trim() || !a.trim()}>
          <Plus className="size-4" /> Add
        </Button>
      </form>
    </Card>
  );
}

function DetailsCard({ p }: { p: Product }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(() => ({ title: p.title, description: p.description, category: p.category, condition: p.condition, brand: p.brand, model: p.model, attributes: p.attributes }));
  return (
    <Card id="details">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-display font-bold">Listing details</span>
        <span className="text-sm font-semibold text-brand">{open ? "Close" : "Edit"}</span>
      </button>
      {open && (
        <div className="border-t border-line p-5">
          <DetailsForm value={d} onChange={(x) => setD((v) => ({ ...v, ...x }))} />
          <div className="mt-5 flex justify-end">
            <Button
              onClick={async () => {
                updateItem(p.id, d);
                await syncListingText(p.id);
                toast("Listing updated");
                setOpen(false);
              }}
            >
              Save details
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
