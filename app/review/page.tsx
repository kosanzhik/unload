"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import { ActionBar } from "@/components/chrome";
import { EmptyBatch, FlowShell, PageTitle, Thumb, useItemPhoto } from "@/components/flow";
import { Badge, Button, Card, Help, Label } from "@/components/ui";
import { useBatch } from "@/lib/store";
import { CATEGORIES, CONDITIONS, type Category, type Condition, type Item } from "@/lib/types";
import { cn } from "@/lib/util";

export default function ReviewPage() {
  return (
    <FlowShell>
      <Review />
    </FlowShell>
  );
}

function Review() {
  const b = useBatch();
  const router = useRouter();
  const photo = useItemPhoto();
  const [selected, setSelected] = useState<string | null>(null);

  if (!b.items.length) return <EmptyBatch />;

  const current = b.items.find((i) => i.id === selected) ?? b.items.find((i) => !i.confirmed) ?? b.items[0];
  const pending = b.items.filter((i) => !i.confirmed);

  const confirmAndNext = (id: string) => {
    b.updateItem(id, { confirmed: true });
    const next = b.items.find((i) => !i.confirmed && i.id !== id);
    if (next) setSelected(next.id);
  };

  const editor = (item: Item) => (
    <ItemEditor
      key={item.id}
      item={item}
      src={photo(item)}
      onChange={(d) => b.updateItem(item.id, d)}
      onRemove={() => {
        b.removeItem(item.id);
        setSelected(null);
      }}
      onConfirm={() => confirmAndNext(item.id)}
    />
  );

  return (
    <>
      <main className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-8 sm:px-6 sm:py-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-8">
        <section>
          <PageTitle
            title="Let's make sure we've got these right."
            sub="We suggested item names from your photos. Confirm the details before we make the drafts."
          />
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge>{b.items.length} items</Badge>
            {pending.length > 0 && <Badge tone="warning">{pending.length} need details</Badge>}
          </div>
          {pending.length > 0 && (
            <div className="mb-4 flex gap-3 rounded-2xl bg-warning-100 p-4 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-warning" />
              <div>
                <p className="font-semibold text-warning">
                  {pending.length} item{pending.length > 1 ? "s need" : " needs"} a few details
                </p>
                <p className="text-ink-650">Confirm the condition and anything we couldn&apos;t see in the photo.</p>
              </div>
            </div>
          )}
          <ul className="space-y-3">
            {b.items.map((item) => {
              const active = item.id === current.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setSelected(item.id)}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-[20px] border bg-surface p-3 text-left transition sm:p-4",
                      active ? "border-ink-900 ring-1 ring-ink-900" : "border-line hover:border-ink-450",
                    )}
                  >
                    <Thumb src={photo(item)} className="size-16 shrink-0 sm:size-20" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-bold">{item.name}</p>
                      <p className="truncate text-sm text-ink-650">
                        {[
                          item.category,
                          item.condition,
                          item.quantity && `${item.quantity} pcs`,
                          !item.confirmed && item.note,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {item.confirmed ? (
                      <Badge tone="success">Confirmed</Badge>
                    ) : (
                      <Badge tone="warning">Needs review</Badge>
                    )}
                    <ChevronRight className="hidden size-5 text-ink-450 sm:block" />
                  </button>
                  {active && <div className="mt-3 lg:hidden">{editor(item)}</div>}
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => setSelected(b.addItem())}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[20px] border border-dashed border-line py-4 text-sm font-semibold text-ink-650 hover:border-ink-450"
          >
            <Plus className="size-4" /> Add an item manually
          </button>
          <p className="mt-4 rounded-2xl bg-soft p-4 text-sm text-ink-650">
            Not sure about a detail? Leave it blank. We&apos;ll mark that draft &ldquo;Needs a check&rdquo; so
            nothing gets posted with a guess.
          </p>
        </section>
        <aside className="hidden lg:block">
          <div className="sticky top-28">{editor(current)}</div>
        </aside>
      </main>

      <ActionBar>
        <Button variant="ghost" href="/upload">
          Back to photos
        </Button>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-650 sm:inline">
            {b.items.length - pending.length} of {b.items.length} confirmed
          </span>
          <Button
            onClick={() => {
              b.planIfNeeded();
              router.push("/plan");
            }}
          >
            {pending.length ? "Continue to plan" : `Confirm ${b.items.length} items`}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </ActionBar>
    </>
  );
}

function ItemEditor({
  item,
  src,
  onChange,
  onRemove,
  onConfirm,
}: {
  item: Item;
  src?: string;
  onChange: (d: Partial<Item>) => void;
  onRemove: () => void;
  onConfirm: () => void;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <Thumb src={src} className="aspect-[16/10] w-full rounded-[16px]" />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-ink-450">{item.photoId ? "1 of 1 photos" : "No photo"}</p>
        {item.confirmed ? <Badge tone="success">Confirmed</Badge> : <Badge tone="warning">Needs review</Badge>}
      </div>
      <div className="mt-4 space-y-4">
        <label className="block">
          <Label>Item name</Label>
          <input className="field" value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <Label>Category</Label>
            <select
              className="field"
              value={item.category}
              onChange={(e) => onChange({ category: e.target.value as Category })}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Condition</Label>
            <select
              className="field"
              value={item.condition}
              onChange={(e) => onChange({ condition: e.target.value as Condition })}
            >
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <Label>Brand / model</Label>
          <input
            className="field"
            placeholder="Not confirmed"
            value={item.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
          />
          <Help>Only add this if you can see it on the item or its label.</Help>
        </label>
        <label className="block">
          <Label>Accessories included</Label>
          <input
            className="field"
            placeholder="Cables, case, stand…"
            value={item.accessories}
            onChange={(e) => onChange({ accessories: e.target.value })}
          />
        </label>
        <label className="block">
          <Label>Issues or wear</Label>
          <textarea
            className="field min-h-20 resize-y"
            placeholder="Add scratches, dead pixels, or missing parts"
            value={item.issues}
            onChange={(e) => onChange({ issues: e.target.value })}
          />
        </label>
        <label className="block">
          <Label>Asking price</Label>
          <div className="relative">
            <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-ink-450">$</span>
            <input
              className="field pl-7"
              inputMode="decimal"
              placeholder="Add your asking price"
              value={item.price}
              onChange={(e) => onChange({ price: e.target.value.replace(/[^0-9.]/g, "") })}
            />
          </div>
          <Help>You set this. UNLOAD doesn&apos;t predict sale prices.</Help>
        </label>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-error hover:text-error">
          <Trash2 className="size-4" /> Remove
        </Button>
        <Button variant={item.confirmed ? "secondary" : "primary"} size="sm" onClick={onConfirm}>
          <Check className="size-4" /> {item.confirmed ? "Confirmed" : "Confirm this item"}
        </Button>
      </div>
    </Card>
  );
}
