"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, Camera, Check, ChevronDown, Loader2, Lock, Rocket, ScanSearch, Sparkles, X } from "lucide-react";
import { DetailsForm } from "@/components/product-forms";
import { MarketplaceBadge } from "@/components/status";
import { Badge, Button, Card, Help, Label, Note, Segmented, Thumb, Toggle, useToast } from "@/components/ui";
import type { Currency, Goal, MarketplaceId, Photo, SellerQuestion } from "@/lib/core/types";
import { ADAPTERS, MARKETPLACE_ORDER } from "@/lib/marketplaces/registry";
import { counterFor, money } from "@/lib/negotiation/policy";
import { activateAutopilot, createItem, makeFact, useApp, type NewItem } from "@/lib/store";
import { GOAL_ORDER, GOALS, suggestedMinimum } from "@/lib/strategy/engine";
import { cn, fileToDataUrl, uid } from "@/lib/util";
import { blankDraft, SAMPLES } from "@/lib/vision/demo";

const STEPS = ["Photo", "Listing", "Goal", "Approve"] as const;

type Draft = Omit<NewItem, "facts">;

const empty = (): Draft => ({
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
  goal: "balanced",
  pricing: { currency: "USD", desired: null, minimum: null },
  autopilot: true,
  logistics: { pickup: true, shipping: false, area: "" },
  analysis: null,
});

const GOAL_ICON: Record<Goal, string> = { fast: "⚡", balanced: "⚖️", max: "💰" };

export default function SellPage() {
  const router = useRouter();
  const toast = useToast();
  const ai = useApp((s) => s.ai);
  const integrations = useApp((s) => s.integrations);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(empty);
  const [sample, setSample] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [minTouched, setMinTouched] = useState(false);
  const [markets, setMarkets] = useState<MarketplaceId[]>(["mock"]);
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

  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const s = SAMPLES.find((x) => x.id === sample);
      if (!s && ai.claude) {
        const r = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: d.photos.map((p) => p.src), hint: "" }),
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
          sellerQuestions: (j.sellerQuestions as Omit<SellerQuestion, "id">[]).slice(0, 3).map((q) => ({ ...q, id: uid("q"), topic: q.topic.toLowerCase() })),
          analysis: { source: "claude", at: Date.now() },
        });
      } else {
        await new Promise((r) => setTimeout(r, 1100));
        const draft = s ? s.draft() : blankDraft(d.photos.length);
        patch({ ...draft, sellerQuestions: draft.sellerQuestions.slice(0, 3), analysis: { source: s ? "demo" : "manual", at: Date.now() } });
        if (!s) setEditing(true);
      }
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  function setGoal(goal: Goal) {
    const desired = d.pricing.desired;
    patch({ goal, pricing: { ...d.pricing, minimum: !minTouched && desired ? suggestedMinimum(desired, goal) : d.pricing.minimum } });
  }

  function setAsking(v: string) {
    const desired = v.trim() ? Math.max(0, Number(v.replace(/[^0-9.]/g, "")) || 0) : null;
    patch({ pricing: { ...d.pricing, desired, minimum: !minTouched && desired ? suggestedMinimum(desired, d.goal) : d.pricing.minimum } });
  }

  const { desired, minimum, currency } = d.pricing;
  const isBlocked = (m: MarketplaceId) => {
    const a = ADAPTERS[m];
    const needsConnect = a.capabilities.publish && m !== "mock" && integrations[m]?.state !== "connected";
    return needsConnect || (m === "olx" && currency !== "KZT") || (m !== "olx" && m !== "mock" && currency !== "USD");
  };
  const chosen = markets.filter((m) => !isBlocked(m));
  const priceError = desired == null ? "Set your asking price." : minimum != null && minimum > desired ? "Your minimum can't be above the asking price." : null;
  const example = useMemo(() => {
    if (desired == null || priceError) return null;
    const offer = Math.round((desired * 0.8) / 5) * 5;
    return { offer, counter: counterFor(d.pricing, d.goal) };
  }, [desired, priceError, d.pricing, d.goal]);

  async function activate(publish: boolean) {
    setBusy(true);
    const facts = d.sellerQuestions.filter((q) => q.answer?.trim()).map((q) => makeFact(q.topic, q.question, q.answer!.trim(), true));
    const id = createItem({ ...d, facts, autopilot: publish });
    if (publish) {
      await activateAutopilot(id, chosen);
      toast("Autopilot is on");
    } else toast("Saved as draft");
    router.push(`/items/${id}`);
  }

  const canNext = [d.photos.length > 0, d.title.trim().length >= 3, true, !priceError && chosen.length > 0][step];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Sell an item</h1>
        <p className="mt-1 text-ink-500">Take a photo, choose a goal, approve. Your AI seller does the rest.</p>
      </div>

      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              disabled={i > step}
              onClick={() => setStep(i)}
              className={cn("flex w-full flex-col gap-2 text-left text-xs font-semibold sm:text-sm", i === step ? "text-ink-900" : i < step ? "text-brand" : "text-ink-400")}
            >
              <span className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-brand" : "bg-line")} />
              <span className="flex items-center gap-1.5">
                {i < step ? <Check className="size-3.5" /> : <span className="tabular-nums">{i + 1}.</span>} {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* ------------------------------ 1. Photo ------------------------------ */}
      {step === 0 && (
        <Card className="animate-rise p-5 sm:p-6">
          <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
          {d.photos.length === 0 ? (
            <button
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}
              className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-line bg-canvas px-6 py-14 text-center transition hover:border-brand"
            >
              <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
                <Camera className="size-6" />
              </span>
              <span className="font-display text-xl font-bold">Take or upload a photo</span>
              <span className="mt-1 text-sm text-ink-500">A few angles help. Front, back, label.</span>
            </button>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {d.photos.map((p) => (
                <li key={p.id} className="relative">
                  <Thumb src={p.src} alt={p.name} className="aspect-square" />
                  <button
                    aria-label={`Remove ${p.name}`}
                    onClick={() => (patch({ photos: d.photos.filter((x) => x.id !== p.id) }), p.id.startsWith("s-") && setSample(null))}
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

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-500">Or try a sample:</span>
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => (setSample(s.id), patch({ photos: s.photos, demo: true }))}
                className={cn("flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 font-semibold transition", sample === s.id ? "border-brand bg-brand-50 text-brand-700" : "border-line hover:border-ink-400")}
              >
                <Thumb src={s.photos[0].src} className="size-7 rounded-full" /> {s.label}
              </button>
            ))}
          </div>

          {!ai.claude && !sample && d.photos.length > 0 && (
            <div className="mt-4">
              <Note tone="warning">AI vision is off on this deployment, so you&apos;ll type the item details yourself. Sample photos show the full AI flow.</Note>
            </div>
          )}
          {error && <p className="mt-3 text-sm font-medium text-error">{error}</p>}

          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={analyze} disabled={!canNext || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
              {busy ? "AI is looking at your photo…" : "Analyze photo"}
            </Button>
          </div>
        </Card>
      )}

      {/* ------------------------------ 2. Listing ------------------------------ */}
      {step === 1 && (
        <div className="animate-rise space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:p-6">
              <Thumb src={d.photos[0]?.src} className="aspect-square w-full shrink-0 sm:w-40" />
              <div className="min-w-0 flex-1">
                <Badge tone="brand">
                  <Sparkles className="size-3" /> {d.analysis?.source === "claude" ? "Written by AI" : d.analysis?.source === "demo" ? "Sample AI result" : "Your listing"}
                </Badge>
                <h2 className="mt-2 text-xl font-extrabold">{d.title || "Untitled item"}</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {[d.brand && [d.brand, d.model].filter(Boolean).join(" "), d.category, `${d.condition} condition`].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-3 line-clamp-4 text-sm whitespace-pre-line text-ink-700">{d.description}</p>
                <button onClick={() => setEditing((e) => !e)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {editing ? "Done editing" : "Edit details"} <ChevronDown className={cn("size-4 transition", editing && "rotate-180")} />
                </button>
              </div>
            </div>
            {editing && (
              <div className="border-t border-line p-5 sm:p-6">
                <DetailsForm value={d} onChange={patch} />
              </div>
            )}
          </Card>

          {d.sellerQuestions.length > 0 && (
            <Card className="p-5 sm:p-6">
              <p className="font-display font-bold">Quick questions only you can answer</p>
              <p className="text-sm text-ink-500">Optional. Answers let the AI reply to buyers instantly instead of asking you later.</p>
              <ul className="mt-4 space-y-3">
                {d.sellerQuestions.map((q) => (
                  <li key={q.id}>
                    <label htmlFor={q.id} className="text-sm font-semibold">
                      {q.question}
                    </label>
                    <input
                      id={q.id}
                      className="field mt-1.5"
                      placeholder="Skip if you're not sure"
                      value={q.answer ?? ""}
                      onChange={(e) => patch({ sellerQuestions: d.sellerQuestions.map((x) => (x.id === q.id ? { ...x, answer: e.target.value } : x)) })}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------ 3. Goal ------------------------------ */}
      {step === 2 && (
        <div className="animate-rise">
          <p className="mb-4 font-display text-xl font-bold">What matters most?</p>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup">
            {GOAL_ORDER.map((g) => {
              const on = d.goal === g;
              const G = GOALS[g];
              return (
                <button
                  key={g}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setGoal(g)}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-surface p-5 text-left transition hover:-translate-y-0.5",
                    on ? "border-brand ring-2 ring-brand shadow-[var(--shadow-card)]" : "border-line hover:border-ink-400",
                  )}
                >
                  <span className="text-2xl" aria-hidden>
                    {GOAL_ICON[g]}
                  </span>
                  <span className="mt-3 font-display text-lg font-bold">{G.label}</span>
                  <span className="text-sm text-ink-500">{G.tagline}</span>
                  <ul className="mt-4 space-y-1.5 text-xs text-ink-700">
                    {G.bullets.map((b) => (
                      <li key={b} className="flex gap-1.5">
                        <Check className={cn("mt-px size-3.5 shrink-0", on ? "text-brand" : "text-ink-400")} /> {b}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-ink-400">No strategy guarantees a sale. It changes how the AI negotiates and when it suggests changes.</p>
        </div>
      )}

      {/* ------------------------------ 4. Approve ------------------------------ */}
      {step === 3 && (
        <div className="animate-rise space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-lg font-bold">Price & limits</p>
              <Segmented<Currency>
                value={currency}
                onChange={(c) => patch({ pricing: { ...d.pricing, currency: c } })}
                options={[
                  { value: "USD", label: "$ USD" },
                  { value: "KZT", label: "₸ KZT" },
                ]}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ask">Asking price</Label>
                <input id="ask" inputMode="decimal" className="field text-lg font-semibold" placeholder="e.g. 150" value={desired ?? ""} onChange={(e) => setAsking(e.target.value)} />
                <Help>What buyers see. UNLOAD doesn&apos;t guess market prices.</Help>
              </div>
              <div>
                <Label htmlFor="min" hint={<span className="inline-flex items-center gap-1"><Lock className="size-3" /> private</span>}>
                  Lowest you&apos;ll accept
                </Label>
                <input
                  id="min"
                  inputMode="decimal"
                  className="field text-lg font-semibold"
                  placeholder="Never shown"
                  value={minimum ?? ""}
                  onChange={(e) => {
                    setMinTouched(true);
                    patch({ pricing: { ...d.pricing, minimum: e.target.value.trim() ? Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 : null } });
                  }}
                />
                <Help>{minTouched ? "The AI never goes below or reveals it." : `Suggested for ${GOALS[d.goal].label}. Change it if you like.`}</Help>
              </div>
            </div>
            {priceError && desired != null && <p className="mt-3 text-sm font-medium text-error">{priceError}</p>}
            {example && (
              <div className="mt-4 rounded-xl bg-brand-50 p-4 text-sm text-brand-700">
                <p className="flex items-center gap-1.5 font-semibold">
                  <Bot className="size-4" /> {GOALS[d.goal].label} in action
                </p>
                <p className="mt-1">
                  Buyer offers {money(example.offer, currency)} → AI replies: “The seller is asking {money(desired, currency)}. I can offer {money(example.counter, currency)}.” When a buyer agrees, you get
                  a notification to accept.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="font-display text-lg font-bold">Where to sell</p>
            <ul className="mt-3 divide-y divide-line">
              {(["mock", ...MARKETPLACE_ORDER.filter((m) => m !== "mock" && m !== "mercari")] as MarketplaceId[]).map((m) => {
                const a = ADAPTERS[m];
                const st = integrations[m]?.state;
                const needsConnect = a.capabilities.publish && m !== "mock" && st !== "connected";
                const blocked = isBlocked(m);
                const on = markets.includes(m) && !blocked;
                return (
                  <li key={m} className="flex items-center gap-3 py-3">
                    <input
                      id={`mk-${m}`}
                      type="checkbox"
                      className="size-4 accent-brand"
                      checked={on}
                      disabled={blocked}
                      onChange={(e) => setMarkets((x) => (e.target.checked ? [...x, m] : x.filter((y) => y !== m)))}
                    />
                    <label htmlFor={`mk-${m}`} className={cn("min-w-0 flex-1", blocked ? "text-ink-400" : "cursor-pointer")}>
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {a.name} {m === "mock" ? <Badge tone="brand">Demo</Badge> : <MarketplaceBadge state={st} />}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {m === "mock"
                          ? "Built-in demo marketplace with simulated buyers — try the whole flow."
                          : needsConnect
                            ? "Connect it on the Marketplaces page first."
                            : !a.capabilities.publish
                              ? "No public API — you'll get a ready-to-copy listing."
                              : a.market}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <Link href="/marketplaces" className="mt-1 inline-block text-xs font-semibold text-brand">
              Manage marketplaces →
            </Link>
          </Card>

          <Card className="px-5 sm:px-6">
            <div className="divide-y divide-line">
              <Toggle checked={d.logistics.pickup} onChange={(pickup) => patch({ logistics: { ...d.logistics, pickup } })} label="Local pickup" />
              {d.logistics.pickup && (
                <div className="pb-3">
                  <input aria-label="Pickup area" className="field" placeholder="Pickup area, e.g. Midtown (not your address)" value={d.logistics.area} onChange={(e) => patch({ logistics: { ...d.logistics, area: e.target.value } })} />
                </div>
              )}
              <Toggle checked={d.logistics.shipping} onChange={(shipping) => patch({ logistics: { ...d.logistics, shipping } })} label="Shipping" />
            </div>
          </Card>

          <p className="px-1 text-xs text-ink-500">
            By activating, you approve this listing and these limits. The AI answers buyers and negotiates inside your range; you approve every final deal.
          </p>
        </div>
      )}

      {/* ------------------------------ Nav ------------------------------ */}
      {step > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={busy}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < 3 ? (
            <Button size="lg" onClick={() => setStep(step + 1)} disabled={!canNext}>
              {step === 1 ? "Looks good" : "Continue"} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => activate(false)} disabled={busy || Boolean(priceError)}>
                Save draft
              </Button>
              <Button size="lg" onClick={() => activate(true)} disabled={!canNext || busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Approve & activate Autopilot
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
