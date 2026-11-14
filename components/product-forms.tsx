"use client";

import { Lock, Plus, Trash2 } from "lucide-react";
import { Help, Label, Note, Segmented, Toggle } from "./ui";
import { CATEGORIES, CONDITIONS, type Category, type Condition, type PricingRules, type Product } from "@/lib/core/types";
import { evaluateOffer, floor, money } from "@/lib/negotiation/policy";

type Details = Pick<Product, "title" | "description" | "category" | "condition" | "brand" | "model" | "attributes">;

export function DetailsForm({ value, onChange }: { value: Details; onChange: (d: Partial<Details>) => void }) {
  const attrs = value.attributes;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="f-title" hint={`${value.title.length}/70`}>
          Title
        </Label>
        <input id="f-title" className="field" maxLength={100} value={value.title} placeholder="e.g. 27-inch monitor with stand" onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="f-cat">Category</Label>
        <select id="f-cat" className="field" value={value.category} onChange={(e) => onChange({ category: e.target.value as Category })}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="f-cond">Actual condition</Label>
        <select id="f-cond" className="field" value={value.condition} onChange={(e) => onChange({ condition: e.target.value as Condition })}>
          {CONDITIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="f-brand" hint="only if you can see it">
          Brand
        </Label>
        <input id="f-brand" className="field" value={value.brand} placeholder="Not confirmed" onChange={(e) => onChange({ brand: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="f-model" hint="from the label">
          Model
        </Label>
        <input id="f-model" className="field" value={value.model} placeholder="Not confirmed" onChange={(e) => onChange({ model: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="f-desc">Description</Label>
        <textarea id="f-desc" className="field min-h-28 resize-y leading-relaxed" value={value.description} onChange={(e) => onChange({ description: e.target.value })} />
        <Help>Only what you can stand behind. The agent quotes this to buyers.</Help>
      </div>
      <div className="sm:col-span-2">
        <Label>Attributes</Label>
        <ul className="space-y-2">
          {attrs.map((a, i) => (
            <li key={i} className="flex gap-2">
              <input
                aria-label="Attribute name"
                className="field w-2/5"
                value={a.name}
                placeholder="Name"
                onChange={(e) => onChange({ attributes: attrs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
              />
              <input
                aria-label="Attribute value"
                className="field"
                value={a.value}
                placeholder="Value"
                onChange={(e) => onChange({ attributes: attrs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })}
              />
              <button
                aria-label={`Remove ${a.name || "attribute"}`}
                onClick={() => onChange({ attributes: attrs.filter((_, j) => j !== i) })}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink-500 hover:text-error"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => onChange({ attributes: [...attrs, { name: "", value: "" }] })} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
          <Plus className="size-4" /> Add attribute
        </button>
      </div>
    </div>
  );
}

const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v.replace(/[^0-9.]/g, "")) || 0));

export function pricingError(p: PricingRules) {
  if (p.minimum != null && p.desired != null && p.minimum > p.desired) return "Your minimum can't be higher than the asking price.";
  if (p.negotiationEnabled && p.minimum == null) return "Set a private minimum to let the agent negotiate.";
  return null;
}

export function PricingForm({ value, onChange }: { value: PricingRules; onChange: (p: Partial<PricingRules>) => void }) {
  const err = pricingError(value);
  const sample = value.desired != null ? Math.round(value.desired * 0.8) : null;
  const example = sample != null && !err ? evaluateOffer(sample, value) : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold">Currency</span>
        <Segmented
          value={value.currency}
          onChange={(currency) => onChange({ currency })}
          options={[
            { value: "USD", label: "USD $" },
            { value: "KZT", label: "KZT ₸" },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-desired">Asking price</Label>
          <input id="p-desired" inputMode="decimal" className="field" placeholder="Public price" value={value.desired ?? ""} onChange={(e) => onChange({ desired: num(e.target.value) })} />
          <Help>Shown to buyers.</Help>
        </div>
        <div>
          <Label htmlFor="p-min" hint={<span className="inline-flex items-center gap-1"><Lock className="size-3" /> private</span>}>
            Minimum you&apos;d accept
          </Label>
          <input id="p-min" inputMode="decimal" className="field" placeholder="Never shown to buyers" value={value.minimum ?? ""} onChange={(e) => onChange({ minimum: num(e.target.value) })} />
          <Help>The agent never reveals this number.</Help>
        </div>
      </div>
      <div className="rounded-xl border border-line px-4">
        <Toggle
          checked={value.negotiationEnabled}
          onChange={(negotiationEnabled) => onChange({ negotiationEnabled })}
          label="Let the agent make counteroffers"
          description="Only between your asking price and your private minimum. Final acceptance is always yours."
        />
        {value.negotiationEnabled && (
          <div className="border-t border-line py-3">
            <Label htmlFor="p-disc" hint={`${value.maxDiscountPct}% off asking`}>
              Maximum discount
            </Label>
            <input id="p-disc" type="range" min={0} max={50} step={1} className="w-full accent-brand" value={value.maxDiscountPct} onChange={(e) => onChange({ maxDiscountPct: Number(e.target.value) })} />
            <Help>Extra cap on top of your minimum. Lowest possible counteroffer: {money(floor(value), value.currency)}.</Help>
          </div>
        )}
      </div>
      {err && <p className="text-sm font-medium text-error">{err}</p>}
      {example && sample != null && (
        <Note tone="brand">
          Example: a buyer offers {money(sample, value.currency)} →{" "}
          {example.action === "counter"
            ? `the agent replies “The seller is asking ${money(value.desired, value.currency)}. I can offer ${money(example.counter, value.currency)}.”`
            : example.action === "forward"
              ? "the agent passes it to you to accept."
              : `the agent restates the asking price (${money(value.desired, value.currency)}).`}
        </Note>
      )}
      <Note>UNLOAD doesn&apos;t estimate prices: no trustworthy sales data is connected, so every amount here is yours.</Note>
    </div>
  );
}
