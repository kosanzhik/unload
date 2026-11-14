"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  BookCheck,
  Bot,
  ClipboardCopy,
  Download,
  ExternalLink,
  Lightbulb,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Rocket,
  Ruler,
  ShieldCheck,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { EvidenceChip } from "@/components/evidence";
import { DetailsForm, PricingForm, pricingError } from "@/components/product-forms";
import { ListingBadge, MarketplaceBadge, ProductBadge } from "@/components/status";
import { Badge, Button, Card, CardHeader, Empty, Help, Label, Modal, Note, Thumb, Toggle, useToast } from "@/components/ui";
import type { Fact, Listing, MarketplaceId, Product } from "@/lib/core/types";
import { listingAsText } from "@/lib/listing/drafts";
import { ADAPTERS, MARKETPLACE_ORDER } from "@/lib/marketplaces/registry";
import { money } from "@/lib/negotiation/policy";
import {
  addFact,
  approveListingUpdate,
  deleteProduct,
  dismissListingUpdate,
  makeFact,
  markExportedPosted,
  prepareListings,
  publishListing,
  refreshListing,
  removeFact,
  removeListing,
  setListingAvailability,
  startDemoConversation,
  syncListingText,
  updateListing,
  updateProduct,
  useApp,
  useHydrated,
} from "@/lib/store";
import { adviseProduct } from "@/lib/strategy/advisor";
import { cn, fileToDataUrl, uid } from "@/lib/util";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const products = useApp((s) => s.products);
  const p = products.find((x) => x.id === id);
  if (!hydrated) return null;
  if (!p)
    return (
      <Card>
        <Empty icon={<Store className="size-5" />} title="Product not found" body="It may have been deleted." action={<Button href="/dashboard">Back to dashboard</Button>} />
      </Card>
    );
  return <ProductView p={p} />;
}

function ProductView({ p }: { p: Product }) {
  const router = useRouter();
  const toast = useToast();
  const allListings = useApp((s) => s.listings);
  const conversations = useApp((s) => s.conversations);
  const deals = useApp((s) => s.deals);
  const tasks = useApp((s) => s.tasks);
  const integrations = useApp((s) => s.integrations);
  const listings = useMemo(() => allListings.filter((l) => l.productId === p.id), [allListings, p.id]);
  const states = useMemo(() => Object.fromEntries(Object.entries(integrations).map(([k, v]) => [k, v?.state])), [integrations]);
  const advice = useMemo(() => adviseProduct(p, listings, conversations, deals, states), [p, listings, conversations, deals, states]);
  const openTasks = tasks.filter((t) => t.productId === p.id && t.status === "open");
  const mockLive = listings.some((l) => l.marketplace === "mock" && l.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title || "Untitled product"}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <ProductBadge status={p.status} /> {money(p.pricing.desired, p.pricing.currency)} · {p.category} · {p.condition}
            {p.demo && <Badge tone="brand">Sample item</Badge>}
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
                if (confirm("Delete this product, its listings, conversations and deals from UNLOAD? Live listings on marketplaces are not removed.")) {
                  deleteProduct(p.id);
                  router.push("/dashboard");
                }
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      />

      {p.pendingListingUpdates.map((u) => (
        <div key={u.id} className="animate-rise flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center">
          <BookCheck className="size-5 shrink-0 text-brand" />
          <p className="flex-1 text-sm">
            <span className="font-semibold">Add a newly verified fact to your listings?</span> “{u.text}”
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => dismissListingUpdate(p.id, u.id)}>
              Not now
            </Button>
            <Button size="sm" onClick={() => approveListingUpdate(p.id, u.id).then(() => toast("Listings updated"))}>
              Approve update
            </Button>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <ListingsCard p={p} listings={listings} />
          <KnowledgeCard p={p} openTasks={openTasks.length} />
          <DetailsCard p={p} />
          <PricingCard p={p} />
        </div>
        <div className="space-y-6">
          <PhotosCard p={p} />
          <Card>
            <CardHeader icon={<Bot className="size-4" />} title="AI sales agent" />
            <div className="px-5 pb-3">
              <Toggle
                checked={p.agentEnabled}
                onChange={(agentEnabled) => updateProduct(p.id, { agentEnabled })}
                label="Agent active for this product"
                description="Off: every reply waits for your approval."
              />
              <p className="pb-2 text-xs text-ink-500">
                Mode and allowed replies are set in{" "}
                <Link href="/settings" className="font-semibold text-brand">
                  Autopilot settings
                </Link>
                .
              </p>
            </div>
          </Card>
          <Card>
            <CardHeader icon={<Lightbulb className="size-4" />} title="Sales strategy" sub="Measured = your own data. Heuristic = rule of thumb." />
            <ul className="divide-y divide-line">
              {advice.length === 0 && <li className="p-5 text-sm text-ink-500">Nothing to improve right now.</li>}
              {advice.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge tone={a.kind === "measured" ? "success" : "neutral"}>{a.kind === "measured" ? <><Ruler className="size-3" /> Measured</> : "Heuristic"}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{a.title}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{a.body}</p>
                  {a.action && (
                    <Link href={a.action.href} className="mt-2 inline-block text-sm font-semibold text-brand">
                      {a.action.label} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
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
        title="Marketplace listings"
        sub="Publishing happens only after your approval."
        action={
          missing.length > 0 && (
            <div className="flex gap-2">
              <select aria-label="Add marketplace" className="field h-9 w-40 py-1" value={add} onChange={(e) => setAdd(e.target.value as MarketplaceId)}>
                <option value="">Add marketplace…</option>
                {missing.map((m) => (
                  <option key={m} value={m}>
                    {ADAPTERS[m].name}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary" disabled={!add} onClick={() => (prepareListings(p.id, [add as MarketplaceId]), setAdd(""))}>
                <Plus className="size-4" />
              </Button>
            </div>
          )
        }
      />
      {listings.length === 0 ? (
        <Empty icon={<Store className="size-5" />} title="No listings yet" body="Add a marketplace above to create a draft tailored to it." />
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
  const [edit, setEdit] = useState(false);
  const [posted, setPosted] = useState(false);
  const [url, setUrl] = useState("");
  const live = l.status === "active" || l.status === "moderation";
  const canPublish = (l.status === "draft" || l.status === "error") && (a.capabilities.publish ? state === "connected" : true);
  const text = listingAsText({ ...p, title: l.title, description: l.description }, l.marketplace);

  return (
    <li className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{a.name}</p>
        <ListingBadge status={l.status} />
        {l.views != null && <span className="text-xs text-ink-500">{l.views} views (reported)</span>}
        {l.url && (
          <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
            Open <ExternalLink className="size-3" />
          </a>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium">{l.title}</p>
      <p className="text-xs text-ink-500">{money(l.price, l.currency)}</p>
      {l.note && <p className={cn("mt-2 text-xs", l.status === "error" ? "text-error" : "text-ink-500")}>{l.note}</p>}
      {a.capabilities.publish && state !== "connected" && l.status === "draft" && (
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
            <Rocket className="size-4" /> {a.capabilities.publish ? "Publish" : "Prepare for manual posting"}
          </Button>
        )}
        {(l.status === "draft" || l.status === "exported" || l.status === "error") && (
          <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>
            Edit draft
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
        {live && a.capabilities.readStatus && (
          <Button size="sm" variant="ghost" onClick={() => refreshListing(l.id).then(() => toast("Status refreshed"))}>
            <RefreshCw className="size-4" /> Refresh status
          </Button>
        )}
        {live && a.capabilities.availability && (
          <Button size="sm" variant="ghost" onClick={() => setListingAvailability(l.id, false)}>
            Deactivate
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

      <Modal open={edit} onClose={() => setEdit(false)} title={`${a.name} draft`} wide>
        <EditListing l={l} onDone={() => setEdit(false)} titleMax={a.titleMax} />
      </Modal>
      <Modal open={posted} onClose={() => setPosted(false)} title={`Posted on ${a.name}?`}>
        <Label htmlFor="posted-url" hint="optional">
          Link to your listing
        </Label>
        <input id="posted-url" className="field" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Help>UNLOAD can&apos;t read messages from {a.name}. Paste buyer questions into the AI Inbox to get suggested replies.</Help>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => (markExportedPosted(l.id, url), setPosted(false))}>Mark as posted</Button>
        </div>
      </Modal>
    </li>
  );
}

function EditListing({ l, onDone, titleMax }: { l: Listing; onDone: () => void; titleMax: number }) {
  const [title, setTitle] = useState(l.title);
  const [description, setDescription] = useState(l.description);
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="l-title" hint={`${title.length}/${titleMax}`}>
          Title
        </Label>
        <input id="l-title" className="field" maxLength={titleMax} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="l-desc">Description</Label>
        <textarea id="l-desc" className="field min-h-56 resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => (updateListing(l.id, { title, description }), onDone())}>Save draft</Button>
      </div>
    </div>
  );
}

/* ---------------- Knowledge base ---------------- */

const SOURCE: Record<Fact["source"], string> = { seller: "Seller confirmed", evidence: "Seller + evidence", photo: "Visible in photo" };

function KnowledgeCard({ p, openTasks }: { p: Product; openTasks: number }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const unanswered = p.sellerQuestions.filter((x) => !x.answer?.trim() && !p.facts.some((f) => f.topic === x.topic));
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <Card id="knowledge">
      <CardHeader
        icon={<ShieldCheck className="size-4" />}
        title="Living listing · verified knowledge"
        sub="The agent answers buyers only from these facts. New answers you give are added here."
        action={
          openTasks > 0 && (
            <Button size="sm" variant="secondary" href="/inbox?tab=tasks">
              {openTasks} open check{openTasks > 1 ? "s" : ""}
            </Button>
          )
        }
      />
      {unanswered.length > 0 && (
        <div className="border-b border-line bg-warning-50/40 p-4 sm:p-5">
          <p className="mb-3 text-sm font-semibold">Unanswered questions from the AI analysis</p>
          <ul className="space-y-3">
            {unanswered.map((x) => (
              <li key={x.id} className="flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{x.question}</p>
                  <input
                    aria-label={x.question}
                    className="field mt-1.5"
                    placeholder="Your answer"
                    value={answers[x.id] ?? ""}
                    onChange={(e) => setAnswers((m) => ({ ...m, [x.id]: e.target.value }))}
                  />
                </div>
                <Button
                  size="sm"
                  className="self-end"
                  disabled={!answers[x.id]?.trim()}
                  onClick={() => {
                    addFact(p.id, makeFact({ topic: x.topic, question: x.question, answer: answers[x.id].trim(), source: "seller", inListing: false }));
                    updateProduct(p.id, { sellerQuestions: p.sellerQuestions.map((s) => (s.id === x.id ? { ...s, answer: answers[x.id].trim() } : s)) });
                    toast("Added to verified knowledge");
                  }}
                >
                  Save
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="divide-y divide-line">
        {p.facts.length === 0 && <li className="p-5 text-sm text-ink-500">No verified facts yet. Until there are, the agent asks you before answering detail questions.</li>}
        {p.facts.map((f) => (
          <li key={f.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink-500">{f.question}</p>
              <p className="mt-0.5 text-sm">{f.answer}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={f.source === "evidence" ? "success" : "neutral"}>{SOURCE[f.source]}</Badge>
                {f.evidenceIds.map((eid) => {
                  const e = p.evidence.find((x) => x.id === eid);
                  return e ? <EvidenceChip key={eid} e={e} /> : null;
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-ink-500">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={f.inListing}
                  onChange={(e) => {
                    updateProduct(p.id, { facts: p.facts.map((x) => (x.id === f.id ? { ...x, inListing: e.target.checked } : x)) });
                    syncListingText(p.id);
                  }}
                />
                In listing
              </label>
              <button aria-label="Remove fact" onClick={() => removeFact(p.id, f.id)} className="text-ink-400 hover:text-error">
                <X className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:p-5">
        <input aria-label="Question" className="field" placeholder="Question, e.g. Does it come with the box?" value={q} onChange={(e) => setQ(e.target.value)} />
        <input aria-label="Answer" className="field" placeholder="Verified answer" value={a} onChange={(e) => setA(e.target.value)} />
        <Button
          variant="secondary"
          disabled={!q.trim() || !a.trim()}
          onClick={() => {
            addFact(p.id, makeFact({ topic: q.trim().toLowerCase().slice(0, 40), question: q.trim(), answer: a.trim(), source: "seller", inListing: false }));
            setQ("");
            setA("");
          }}
        >
          <Plus className="size-4" /> Add fact
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Details, pricing, photos ---------------- */

function DetailsCard({ p }: { p: Product }) {
  const toast = useToast();
  const [d, setD] = useState(() => ({ title: p.title, description: p.description, category: p.category, condition: p.condition, brand: p.brand, model: p.model, attributes: p.attributes }));
  const dirty = JSON.stringify(d) !== JSON.stringify({ title: p.title, description: p.description, category: p.category, condition: p.condition, brand: p.brand, model: p.model, attributes: p.attributes });
  return (
    <Card id="details">
      <CardHeader title="Product details" sub="Saving updates every listing draft. Live listings update where the marketplace supports it." />
      <div className="p-5">
        <DetailsForm value={d} onChange={(x) => setD((v) => ({ ...v, ...x }))} />
        <div className="mt-5 flex justify-end">
          <Button
            disabled={!dirty}
            onClick={async () => {
              updateProduct(p.id, d);
              await syncListingText(p.id);
              toast("Details saved");
            }}
          >
            Save details
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PricingCard({ p }: { p: Product }) {
  const toast = useToast();
  const [v, setV] = useState(p.pricing);
  const err = pricingError(v);
  const dirty = JSON.stringify(v) !== JSON.stringify(p.pricing);
  return (
    <Card id="pricing">
      <CardHeader title="Pricing rules" sub="The agent negotiates only inside these limits." />
      <div className="p-5">
        <PricingForm value={v} onChange={(x) => setV((s) => ({ ...s, ...x }))} />
        <div className="mt-5 flex justify-end">
          <Button
            disabled={!dirty || Boolean(err)}
            onClick={async () => {
              updateProduct(p.id, { pricing: v });
              await syncListingText(p.id);
              toast("Pricing rules saved");
            }}
          >
            Save pricing
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PhotosCard({ p }: { p: Product }) {
  const input = useRef<HTMLInputElement>(null);
  const [main, setMain] = useState(0);
  return (
    <Card id="photos">
      <CardHeader title="Photos" sub={`${p.photos.length} photo${p.photos.length === 1 ? "" : "s"}`} />
      <div className="p-4">
        <Thumb src={p.photos[main]?.src ?? p.photos[0]?.src} className="aspect-[4/3] w-full" alt={p.title} />
        <div className="mt-3 flex flex-wrap gap-2">
          {p.photos.map((ph, i) => (
            <div key={ph.id} className="group relative">
              <button onClick={() => setMain(i)} aria-label={`Show photo ${i + 1}`} className={cn("block rounded-xl ring-2", i === main ? "ring-brand" : "ring-transparent")}>
                <Thumb src={ph.src} className="size-14" />
              </button>
              {p.photos.length > 1 && (
                <button
                  aria-label="Remove photo"
                  onClick={() => (updateProduct(p.id, { photos: p.photos.filter((x) => x.id !== ph.id) }), setMain(0))}
                  className="absolute -top-1.5 -right-1.5 hidden size-5 items-center justify-center rounded-full bg-ink-900 text-white group-hover:flex"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith("image/"));
              const added = await Promise.all(files.map(async (f) => ({ id: uid("ph"), name: f.name, src: await fileToDataUrl(f, 1200) })));
              updateProduct(p.id, { photos: [...p.photos, ...added] });
              e.target.value = "";
            }}
          />
          <button onClick={() => input.current?.click()} aria-label="Add photos" className="flex size-14 items-center justify-center rounded-xl border border-dashed border-line text-ink-500 hover:border-brand">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mt-3">
          <Note>Photos stay in this browser until you publish to OLX or eBay — then they&apos;re uploaded so the marketplace can show them.</Note>
        </div>
      </div>
    </Card>
  );
}
