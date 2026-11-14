"use client";

import { useState } from "react";
import { ArrowRight, Check, ClipboardCopy, Download, Images, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { ActionBar } from "@/components/chrome";
import { EmptyBatch, FlowShell, PageTitle, Thumb, useItemPhoto } from "@/components/flow";
import { Badge, Button, Card, Help, Label, useToast } from "@/components/ui";
import { draftAsText, draftStatus } from "@/lib/plan";
import { useBatch } from "@/lib/store";
import { CATEGORIES, CONDITIONS, MARKETPLACES, type Category, type Condition, type Draft } from "@/lib/types";
import { cn } from "@/lib/util";

export default function DraftsPage() {
  return (
    <FlowShell>
      <Drafts />
    </FlowShell>
  );
}

function Drafts() {
  const b = useBatch();
  const [sel, setSel] = useState<string | null>(null);

  if (!b.drafts.length)
    return <EmptyBatch text="Your drafts will show up here once you've picked a plan." />;

  const idx = Math.max(0, b.drafts.findIndex((d) => d.id === sel));
  const draft = b.drafts[idx];
  const statuses = b.drafts.map((d) => draftStatus(d, b.items));
  const needs = statuses.filter((s) => s.tone === "warning").length;

  return (
    <>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
        <PageTitle
          title="Your listings are ready for review."
          sub="Edit the details, then copy or export. Nothing is posted automatically."
          aside={
            <Button variant="secondary" href="/plan">
              <Pencil className="size-4" /> Edit my plan
            </Button>
          }
        />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
          <aside className="space-y-4">
            <div className="rounded-[20px] bg-ink-900 p-4 text-white">
              <p className="font-display text-lg font-bold">{b.drafts.length} drafts ready</p>
              {needs > 0 && <p className="mt-0.5 text-sm text-lime-400">{needs} need{needs === 1 && "s"} a detail</p>}
              <ol className="mt-3 space-y-1.5 text-sm">
                {["Review", "Copy or export", "Post yourself"].map((s, i) => (
                  <li key={s} className="flex items-center gap-2 text-white/80">
                    <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-[11px]">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <p className="hidden text-[11px] font-bold tracking-widest text-ink-450 lg:block">DRAFTS</p>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-2 lg:px-0">
              {b.drafts.map((d, i) => (
                <DraftTab key={d.id} draft={d} active={i === idx} status={statuses[i]} onClick={() => setSel(d.id)} />
              ))}
            </ul>
          </aside>

          <DraftEditor key={draft.id} draft={draft} index={idx} />

          <CopyPanel draft={draft} />
        </div>
      </main>

      <ActionBar>
        <Button variant="ghost" href="/plan">
          Back to plan
        </Button>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-650 sm:inline">
            Draft {idx + 1} of {b.drafts.length}
          </span>
          {idx < b.drafts.length - 1 && (
            <span className="hidden sm:block">
              <Button variant="secondary" onClick={() => setSel(b.drafts[idx + 1].id)}>
                Next draft
              </Button>
            </span>
          )}
          <Button href="/done">
            I&apos;m done for now <ArrowRight className="size-4" />
          </Button>
        </div>
      </ActionBar>
    </>
  );
}

function DraftTab({
  draft,
  active,
  status,
  onClick,
}: {
  draft: Draft;
  active: boolean;
  status: ReturnType<typeof draftStatus>;
  onClick: () => void;
}) {
  const b = useBatch();
  const photo = useItemPhoto();
  const first = b.items.find((i) => i.id === draft.itemIds[0]);
  return (
    <li className="w-56 shrink-0 lg:w-auto">
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border bg-surface p-2.5 text-left transition",
          active ? "border-ink-900 ring-1 ring-ink-900" : "border-line hover:border-ink-450",
        )}
      >
        <Thumb src={photo(first)} className="size-11 shrink-0 rounded-[10px]" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{draft.title.split(" — ")[0]}</span>
          <span className={cn("block text-xs", draft.posted ? "text-success" : status.tone === "warning" ? "text-warning" : "text-success")}>
            {draft.posted ? "Posted" : status.label}
          </span>
        </span>
      </button>
    </li>
  );
}

function DraftEditor({ draft, index }: { draft: Draft; index: number }) {
  const b = useBatch();
  const photo = useItemPhoto();
  const status = draftStatus(draft, b.items);
  const its = draft.itemIds.map((id) => b.items.find((i) => i.id === id)).filter(Boolean);
  const set = (d: Partial<Draft>) => b.updateDraft(draft.id, d);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge>Draft {index + 1}</Badge>
          {draft.posted ? <Badge tone="success">Posted</Badge> : <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          Mark as posted
          <input
            type="checkbox"
            className="peer sr-only"
            checked={draft.posted}
            onChange={(e) => set({ posted: e.target.checked })}
          />
          <span className="relative h-6 w-10 rounded-full bg-line transition peer-checked:bg-ink-900 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-lime-400" />
        </label>
      </div>

      <div className="mt-5">
        <Label>Attached photos</Label>
        <div className="flex flex-wrap gap-2">
          {its.map((i) => (
            <Thumb key={i!.id} src={photo(i)} alt={i!.name} className="size-20 rounded-[14px] sm:size-24" />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <Label hint={`${draft.title.length}/80`}>Title</Label>
          <input className="field" maxLength={80} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="block">
          <Label>Description</Label>
          <textarea
            className="field min-h-36 resize-y leading-relaxed"
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
          <Help>Edit freely. Remove anything you can&apos;t confirm.</Help>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label>Category</Label>
            <select className="field" value={draft.category} onChange={(e) => set({ category: e.target.value as Category })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Condition</Label>
            <select className="field" value={draft.condition} onChange={(e) => set({ condition: e.target.value as Condition })}>
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Asking price</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-ink-450">$</span>
              <input
                className="field pl-7"
                inputMode="decimal"
                placeholder="Add your asking price"
                value={draft.price}
                onChange={(e) => set({ price: e.target.value.replace(/[^0-9.]/g, "") })}
              />
            </div>
            <Help>You set this.</Help>
          </label>
          <label className="block">
            <Label>Pickup or shipping</Label>
            <select
              className="field"
              value={draft.delivery}
              onChange={(e) => set({ delivery: e.target.value as Draft["delivery"] })}
            >
              {(["Local pickup", "Shipping", "Pickup or shipping"] as const).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <Help>Choose what works for you.</Help>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-error hover:text-error"
          onClick={() => {
            if (confirm("Delete this draft? You can rebuild it from your plan.")) b.deleteDraft(draft.id);
          }}
        >
          <Trash2 className="size-4" /> Delete this draft
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-ink-450">
          <Check className="size-3.5" /> Changes saved for this session
        </span>
      </div>
    </Card>
  );
}

function download(name: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "draft";
}

function CopyPanel({ draft }: { draft: Draft }) {
  const b = useBatch();
  const toast = useToast();
  const photo = useItemPhoto();

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied`);
    } catch {
      toast("Couldn't access the clipboard");
    }
  };

  const actions = [
    { label: "Copy title", icon: ClipboardCopy, run: () => copy(draft.title, "Title") },
    { label: "Copy description", icon: ClipboardCopy, run: () => copy(draft.description, "Description") },
    {
      label: "Download draft",
      icon: Download,
      run: () => {
        const url = URL.createObjectURL(new Blob([draftAsText(draft)], { type: "text/plain" }));
        download(`${slug(draft.title)}.txt`, url);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Draft downloaded");
      },
    },
    {
      label: "Download photos",
      icon: Images,
      run: () => {
        draft.itemIds.forEach((id, i) => {
          const src = photo(b.items.find((x) => x.id === id));
          if (src) download(`${slug(draft.title)}-${i + 1}.jpg`, src);
        });
        toast("Photos downloaded");
      },
    },
  ];

  return (
    <aside className="space-y-4">
      <Card className="p-4">
        <p className="mb-3 font-display font-bold">Copy &amp; export</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {actions.map((a) => (
            <Button key={a.label} variant="secondary" size="sm" onClick={a.run} className="justify-start">
              <a.icon className="size-4" /> {a.label}
            </Button>
          ))}
        </div>
      </Card>
      <Card className="bg-soft p-4">
        <p className="font-display font-bold">Where will you post?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MARKETPLACES.map((m) => {
            const on = b.marketplaces.includes(m);
            return (
              <button
                key={m}
                aria-pressed={on}
                onClick={() => b.toggleMarketplace(m)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  on ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-surface hover:border-ink-450",
                )}
              >
                {on && <Check className="size-3.5" />} {m}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-650">
          UNLOAD doesn&apos;t post for you. Paste your draft into the platform you choose.
        </p>
      </Card>
      <p className="flex items-start gap-2 px-1 text-xs text-ink-450">
        <ShieldCheck className="size-4 shrink-0" />
        Your photos stay in this browser tab. Close it and they&apos;re gone.
      </p>
    </aside>
  );
}
