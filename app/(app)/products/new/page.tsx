"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CircleHelp,
  ImagePlus,
  Loader2,
  Rocket,
  ScanSearch,
  Sparkles,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { DetailsForm, PricingForm, pricingError } from "@/components/product-forms";
import { MarketplaceBadge } from "@/components/status";
import { Badge, Button, Card, CardHeader, Help, Note, Thumb, Toggle, useToast } from "@/components/ui";
import type { MarketplaceId, Photo, PricingRules, Product, SellerQuestion } from "@/lib/core/types";
import { listingDescription, listingTitle } from "@/lib/listing/drafts";
import { ADAPTERS, MARKETPLACE_ORDER } from "@/lib/marketplaces/registry";
import { addFact, createProduct, makeFact, prepareListings, publishListing, useApp, getState } from "@/lib/store";
import { cn, fileToDataUrl, uid } from "@/lib/util";
import { blankDraft, SAMPLES } from "@/lib/vision/demo";

const STEPS = ["Photos", "Verify", "Pricing", "Publish"] as const;

type Draft = Omit<Product, "id" | "createdAt">;

const emptyDraft = (): Draft => ({
  status: "draft",
  demo: false,
  photos: [],
  title: "",
  description: "",
  category: "Other",
  condition: "Good",
  brand: "",
  model: "",
  attributes: [],
  missing: [],
  sellerQuestions: [],
  facts: [],
  evidence: [],
  pricing: { currency: "USD", desired: null, minimum: null, negotiationEnabled: false, maxDiscountPct: 15 },
  pendingListingUpdates: [],
  analysis: null,
  agentEnabled: true,
});

export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();
  const ai = useApp((s) => s.ai);
  const integrations = useApp((s) => s.integrations);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(emptyDraft);
  const [sample, setSample] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inListing, setInListing] = useState<Record<string, boolean>>({});
  const [markets, setMarkets] = useState<MarketplaceId[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    try {
      const photos: Photo[] = await Promise.all(
        [...files].filter((f) => f.type.startsWith("image/")).map(async (f) => ({ id: uid("ph"), name: f.name, src: await fileToDataUrl(f, 1200) })),
      );
      setSample(null);
      patch({ photos: [...d.photos.filter((p) => !p.id.startsWith("s-")), ...photos], demo: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
    }
  }

  function pickSample(id: string) {
    const s = SAMPLES.find((x) => x.id === id)!;
    setSample(id);
    patch({ photos: s.photos, demo: true });
  }

  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const s = SAMPLES.find((x) => x.id === sample);
      if (ai.claude && !s) {
        const r = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: d.photos.map((p) => p.src), hint }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "AI analysis failed");
        patch({
          title: j.title,
          description: [j.description, ...(j.conditionNotes?.length ? [`Visible wear: ${j.conditionNotes.join("; ")}.`] : [])].join("\n"),
          category: j.category,
          condition: j.apparentCondition,
          brand: j.brand,
          model: j.model,
          attributes: j.attributes,
          missing: j.missing,
          sellerQuestions: (j.sellerQuestions as Omit<SellerQuestion, "id">[]).slice(0, 4).map((q) => ({ ...q, id: uid("q"), topic: q.topic.toLowerCase() })),
          analysis: { source: "claude", at: Date.now() },
        });
      } else {
        await new Promise((r) => setTimeout(r, 900));
        patch({ ...(s ? s.draft() : blankDraft(d.photos.length)), analysis: { source: "demo", at: Date.now() } });
      }
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  const unanswered = d.sellerQuestions.filter((q) => !q.answer?.trim()).length;
  const priceErr = pricingError(d.pricing);
  const canNext = [d.photos.length > 0, d.title.trim().length >= 3, !priceErr && d.pricing.desired != null, confirmed][step];

  function save(publish: boolean) {
    const id = createProduct({ ...d, status: "draft" });
    for (const q of d.sellerQuestions)
      if (q.answer?.trim())
        addFact(id, makeFact({ topic: q.topic, question: q.question, answer: q.answer.trim(), source: "seller", inListing: Boolean(inListing[q.id]) }));
    if (markets.length) prepareListings(id, markets);
    if (publish) {
      const ls = getState().listings.filter((l) => l.productId === id);
      ls.forEach((l) => publishListing(l.id));
      toast(markets.length ? "Approved — publishing now" : "Saved");
    } else toast("Saved as draft");
    router.push(`/products/${id}`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Add a product" sub="Photos in, a verified listing and an AI sales agent out. You approve everything before it goes live." />

      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              disabled={i > step}
              onClick={() => setStep(i)}
              className={cn(
                "flex w-full flex-col gap-2 text-left text-xs font-semibold sm:text-sm",
                i === step ? "text-ink-900" : i < step ? "text-brand" : "text-ink-400",
              )}
            >
              <span className={cn("h-1 rounded-full", i <= step ? "bg-brand" : "bg-line")} />
              <span className="flex items-center gap-1.5">
                {i < step ? <Check className="size-3.5" /> : <span className="tabular-nums">{i + 1}.</span>} {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="animate-rise">
          <CardHeader icon={<ImagePlus className="size-4" />} title="Add photos" sub="Several angles of one item: front, back, labels, any wear." />
          <div className="space-y-5 p-5">
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
            {d.photos.length === 0 ? (
              <button
                onClick={() => input.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}
                className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-line bg-canvas px-6 py-12 text-center transition hover:border-brand"
              >
                <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
                  <ImagePlus className="size-5" />
                </span>
                <span className="font-display text-lg font-bold">Drop photos here or browse</span>
                <span className="mt-1 text-sm text-ink-500">JPG, PNG or WebP · up to 6 photos are analyzed</span>
              </button>
            ) : (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {d.photos.map((p) => (
                  <li key={p.id} className="relative">
                    <Thumb src={p.src} alt={p.name} className="aspect-square" />
                    <button
                      aria-label={`Remove ${p.name}`}
                      onClick={() => {
                        patch({ photos: d.photos.filter((x) => x.id !== p.id) });
                        if (p.id.startsWith("s-")) setSample(null);
                      }}
                      className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/90 shadow"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
                {!sample && (
                  <li>
                    <button onClick={() => input.current?.click()} className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-line text-sm font-semibold text-ink-500 hover:border-brand">
                      + Add
                    </button>
                  </li>
                )}
              </ul>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold">No photos handy? Try a sample item</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => pickSample(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border py-1.5 pr-3 pl-1.5 text-sm font-semibold transition",
                      sample === s.id ? "border-brand bg-brand-50 text-brand-700" : "border-line hover:border-ink-400",
                    )}
                  >
                    <Thumb src={s.photos[0].src} className="size-8 rounded-lg" /> {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="hint" className="mb-1.5 block text-sm font-semibold">
                Anything the photos don&apos;t show? <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <input id="hint" className="field" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. bought in 2022, comes with the original box" />
            </div>

            {!ai.claude && !sample && d.photos.length > 0 && (
              <Note tone="warning">Demo mode: AI vision isn&apos;t configured, so you&apos;ll fill in the details yourself on the next step. Nothing is guessed.</Note>
            )}
            {error && <p className="text-sm font-medium text-error">{error}</p>}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-4">
            <Button onClick={analyze} disabled={!canNext || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
              {busy ? "Analyzing photos…" : ai.claude || sample ? "Analyze with AI" : "Continue"}
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <div className="animate-rise grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader
              icon={<Sparkles className="size-4" />}
              title="Verify the details"
              sub={d.analysis?.source === "claude" ? "Drafted by Claude from your photos. Correct anything that's wrong." : d.demo ? "Sample analysis. Correct anything that's wrong." : "Fill in what you know. Leave unknowns blank."}
            />
            <div className="p-5">
              <DetailsForm value={d} onChange={patch} />
            </div>
          </Card>
          <div className="space-y-5">
            <Card>
              <CardHeader icon={<CircleHelp className="size-4" />} title="Questions for you" sub="Answers become verified facts the agent can use." />
              <ul className="divide-y divide-line">
                {d.sellerQuestions.map((q) => (
                  <li key={q.id} className="space-y-2 p-4">
                    <p className="text-sm font-semibold">{q.question}</p>
                    <p className="text-xs text-ink-500">{q.why}</p>
                    <textarea
                      aria-label={q.question}
                      className="field min-h-16 text-sm"
                      placeholder="Leave blank if you're not sure"
                      value={q.answer ?? ""}
                      onChange={(e) => patch({ sellerQuestions: d.sellerQuestions.map((x) => (x.id === q.id ? { ...x, answer: e.target.value } : x)) })}
                    />
                    {q.answer?.trim() && (
                      <label className="flex items-center gap-2 text-xs text-ink-500">
                        <input type="checkbox" className="accent-brand" checked={Boolean(inListing[q.id])} onChange={(e) => setInListing((m) => ({ ...m, [q.id]: e.target.checked }))} />
                        Also mention in the listing
                      </label>
                    )}
                  </li>
                ))}
                {d.sellerQuestions.length === 0 && <li className="p-4 text-sm text-ink-500">No open questions.</li>}
              </ul>
            </Card>
            {d.missing.length > 0 && (
              <Card className="p-4">
                <p className="text-sm font-semibold">Not visible in the photos</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-500">
                  {d.missing.map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
                <Help>Unanswered items stay unknown. If a buyer asks, the agent says so and asks you.</Help>
              </Card>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="animate-rise">
          <CardHeader title="Pricing rules" sub="What the agent may say about price. Your minimum stays private." />
          <div className="p-5">
            <PricingForm value={d.pricing} onChange={(p: Partial<PricingRules>) => patch({ pricing: { ...d.pricing, ...p } })} />
          </div>
        </Card>
      )}

      {step === 3 && (
        <div className="animate-rise space-y-5">
          <Card>
            <CardHeader title="Where to sell" sub="Connected marketplaces publish automatically. Others get a ready-to-copy draft." />
            <ul className="divide-y divide-line">
              {MARKETPLACE_ORDER.map((m) => {
                const a = ADAPTERS[m];
                const st = integrations[m]?.state;
                const on = markets.includes(m);
                const disabled = st === "unavailable" && !a.capabilities.publish;
                return (
                  <li key={m} className="flex items-start gap-3 p-4">
                    <input
                      id={`mk-${m}`}
                      type="checkbox"
                      className="mt-1 size-4 accent-brand"
                      checked={on}
                      disabled={disabled}
                      onChange={(e) => setMarkets((x) => (e.target.checked ? [...x, m] : x.filter((y) => y !== m)))}
                    />
                    <label htmlFor={`mk-${m}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{a.name}</span>
                        <MarketplaceBadge state={st} />
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">{integrations[m]?.detail ?? a.market}</span>
                      {on && (
                        <span className="mt-3 block rounded-xl bg-canvas p-3 text-xs">
                          <span className="block font-semibold text-ink-900">{listingTitle({ ...d, id: "", createdAt: 0 }, m)}</span>
                          <span className="mt-1 line-clamp-3 block whitespace-pre-line text-ink-500">{listingDescription({ ...d, id: "", createdAt: 0 }, m)}</span>
                        </span>
                      )}
                      {on && m === "olx" && d.pricing.currency !== "KZT" && <span className="mt-2 block text-xs font-medium text-warning">OLX Kazakhstan needs a KZT price. Switch currency in Pricing.</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                <Bot className="size-4" />
              </span>
              <div className="flex-1">
                <Toggle
                  checked={d.agentEnabled}
                  onChange={(agentEnabled) => patch({ agentEnabled })}
                  label="Enable the AI sales agent for this product"
                  description="It answers buyers from verified facts, negotiates only within your rules, and asks you about anything else. Behavior follows your Autopilot settings."
                />
              </div>
            </div>
            <label className="mt-3 flex items-start gap-3 rounded-xl border border-line p-4 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-brand" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>
                I confirm the condition and details are accurate, and I approve publishing these listings.
                {unanswered > 0 && <span className="mt-1 block text-xs text-ink-500">{unanswered} question{unanswered > 1 ? "s" : ""} left blank will stay “not verified”.</span>}
              </span>
            </label>
          </Card>
        </div>
      )}

      {step > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => save(false)}>
                Save as draft
              </Button>
              <Button onClick={() => save(true)} disabled={!confirmed || markets.length === 0}>
                <Rocket className="size-4" /> Approve &amp; publish
              </Button>
            </div>
          )}
        </div>
      )}
      {step === 3 && markets.length === 0 && <p className="mt-2 text-right text-xs text-ink-500">Pick at least one marketplace to publish, or save as a draft.</p>}
      {d.analysis && step > 0 && (
        <p className="mt-6 text-center text-xs text-ink-400">
          <Badge>{d.analysis.source === "claude" ? "Analyzed by Claude" : "Demo analysis"}</Badge>
        </p>
      )}
    </div>
  );
}

