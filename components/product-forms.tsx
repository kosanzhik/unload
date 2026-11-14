"use client";

import { Plus, Trash2 } from "lucide-react";
import { Help, Label } from "./ui";
import { CATEGORIES, CONDITIONS, type Category, type Condition, type Product } from "@/lib/core/types";

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

