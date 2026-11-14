"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Info,
  Layers,
  Pencil,
  Rocket,
  Scissors,
  TrendingUp,
} from "lucide-react";
import { ActionBar } from "@/components/chrome";
import { EmptyBatch, FlowShell, PageTitle, Thumb, useItemPhoto } from "@/components/flow";
import { Badge, Button, Card } from "@/components/ui";
import { buildGroups } from "@/lib/plan";
import { useBatch } from "@/lib/store";
import type { Group, Mode } from "@/lib/types";
import { cn, formatMoney, parsePrice } from "@/lib/util";

export default function PlanPage() {
  return (
    <FlowShell>
      <Plan />
    </FlowShell>
  );
}

const MODES: { id: Mode; title: string; body: string; icon: typeof Layers; tag?: string }[] = [
  {
    id: "maximize",
    title: "Maximize asking total",
    body: "More individual drafts. You control each asking price.",
    icon: TrendingUp,
  },
  {
    id: "fewer",
    title: "Fewer listings",
    body: "Group compatible items so there's less to prepare.",
    icon: Layers,
    tag: "GOOD STARTING POINT",
  },
  {
    id: "clear",
    title: "Clear space sooner",
    body: "Focus on the items you'd like to move first.",
    icon: Rocket,
  },
];

const MODE_LABEL: Record<Mode, string> = {
  maximize: "Separate",
  fewer: "Fewer listings",
  clear: "Clear space sooner",
};

function Plan() {
  const b = useBatch();
  const router = useRouter();
  const { items, groups, mode, hydrated, planIfNeeded } = b;

  useEffect(() => {
    if (hydrated && items.length) planIfNeeded();
  }, [hydrated, items.length, planIfNeeded]);

  if (!items.length) return <EmptyBatch />;

  const counts = Object.fromEntries(
    MODES.map((m) => [m.id, m.id === mode ? groups.length : buildGroups(items, m.id).length]),
  ) as Record<Mode, number>;

  return (
    <>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
        <PageTitle
          title="How do you want to sell this batch?"
          sub="Pick the approach that fits your time. You can change it later."
        />

        <div className="grid gap-3 md:grid-cols-3 md:gap-4" role="radiogroup">
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                onClick={() => b.setMode(m.id)}
                className={cn(
                  "flex flex-col rounded-[20px] border p-5 text-left transition",
                  on ? "border-ink-900 bg-lime-100 ring-1 ring-ink-900" : "border-line bg-surface hover:border-ink-450",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-xl", on ? "bg-lime-400" : "bg-soft")}>
                    <m.icon className="size-5" />
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border",
                      on ? "border-ink-900 bg-ink-900 text-lime-400" : "border-line",
                    )}
                  >
                    {on && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </div>
                {m.tag && <p className="mt-4 text-[11px] font-bold tracking-widest text-success">{m.tag}</p>}
                <p className={cn("font-display text-lg font-bold", m.tag ? "mt-1" : "mt-4")}>{m.title}</p>
                <p className="mt-1 text-sm text-ink-650">{m.body}</p>
                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold">
                  {m.id === "clear" ? "Priority order + backup" : `${counts[m.id]} draft listings`}
                </p>
              </button>
            );
          })}
        </div>

        <Card className="mt-6 p-4 sm:mt-8 sm:p-6">
          <p className="text-[11px] font-bold tracking-widest text-ink-450">
            PLAN PREVIEW · {MODE_LABEL[mode].toUpperCase()}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold">
            {items.length} items → {groups.length} draft listing{groups.length !== 1 && "s"}
          </h2>
          {mode === "clear" && (
            <p className="mt-1 text-sm text-ink-650">
              Put what you want gone first at the top. We&apos;ll prepare those drafts first.
            </p>
          )}

          <div className={cn("mt-5 grid grid-cols-[minmax(0,1fr)] gap-4", mode !== "clear" && "sm:grid-cols-2 lg:grid-cols-3")}>
            {groups.map((g, i) =>
              mode === "clear" ? (
                <PriorityRow key={g.id} group={g} index={i} total={groups.length} />
              ) : (
                <GroupCard key={g.id} group={g} />
              ),
            )}
          </div>

          {mode === "fewer" && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Separate plan · {items.length} draft listings</p>
                <p className="text-sm text-ink-650">
                  One draft per item. <AskingTotal />
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => b.setMode("maximize")}>
                Switch to this plan
              </Button>
            </div>
          )}
          {mode !== "fewer" && (
            <p className="mt-5 text-sm text-ink-650">
              <AskingTotal />
            </p>
          )}

          <p className="mt-4 flex items-start gap-2 text-xs text-ink-450">
            <Info className="mt-px size-3.5 shrink-0" />
            Groupings are suggestions. UNLOAD doesn&apos;t predict sale prices or how fast anything will sell.
          </p>
        </Card>
      </main>

      <ActionBar>
        <Button variant="ghost" href="/review">
          Back to items
        </Button>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-650 sm:inline">
            {MODE_LABEL[mode]} · {groups.length} drafts
          </span>
          <Button
            onClick={() => {
              b.createDrafts();
              router.push("/drafts");
            }}
          >
            Create my drafts <ArrowRight className="size-4" />
          </Button>
        </div>
      </ActionBar>
    </>
  );
}

function AskingTotal() {
  const { items } = useBatch();
  const prices = items.map((i) => parsePrice(i.price));
  if (prices.some((p) => p === null))
    return <>Your asking total appears once every item has a price you&apos;ve entered.</>;
  return (
    <>
      Your asking total:{" "}
      <strong className="text-ink-900">{formatMoney(prices.reduce<number>((s, p) => s + (p ?? 0), 0))}</strong>
    </>
  );
}

function GroupCard({ group }: { group: Group }) {
  const b = useBatch();
  const photo = useItemPhoto();
  const [editing, setEditing] = useState(false);
  const its = group.itemIds.map((id) => b.items.find((i) => i.id === id)!).filter(Boolean);
  const others = b.groups.filter((g) => g.id !== group.id);

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border p-4",
        group.undecided ? "border-coral-400 bg-[#fff7f4]" : "border-line bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            className="field py-1.5 font-display font-bold"
            defaultValue={group.name}
            onBlur={(e) => {
              b.renameGroup(group.id, e.target.value.trim() || group.name);
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        ) : (
          <p className="font-display font-bold">{group.name}</p>
        )}
        {group.undecided ? (
          <Badge tone="warning">Your call</Badge>
        ) : (
          <Badge tone={its.length > 1 ? "success" : "neutral"}>
            {its.length} item{its.length > 1 && "s"}
          </Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {its.slice(0, 3).map((i) => (
          <Thumb key={i.id} src={photo(i)} className="aspect-square rounded-[12px]" alt={i.name} />
        ))}
      </div>

      {group.undecided ? (
        <p className="mt-3 text-sm text-ink-650">
          These don&apos;t have much in common. Pair them only if you&apos;d rather post one listing.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5 text-sm">
          {its.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-ink-650">
                {i.name}
                {i.condition === "Fair" && " · please confirm it works"}
              </span>
              {(others.length > 0 || its.length > 1) && (
                <select
                  aria-label={`Move ${i.name}`}
                  className="max-w-28 shrink-0 cursor-pointer rounded-lg bg-soft px-2 py-1 text-xs font-semibold"
                  value=""
                  onChange={(e) => b.moveItem(i.id, e.target.value === "__own" ? null : e.target.value)}
                >
                  <option value="" disabled>
                    Move item
                  </option>
                  {its.length > 1 && <option value="__own">Its own listing</option>}
                  {others.map((g) => (
                    <option key={g.id} value={g.id}>
                      → {g.name.replace(/\?$/, "")}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3 [&]:mt-4">
        {group.undecided ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => b.splitGroup(group.id)}>
              Keep separate
            </Button>
            <Button size="sm" onClick={() => b.acceptPair(group.id)}>
              Pair them
            </Button>
          </>
        ) : (
          <>
            {its.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => b.splitGroup(group.id)}>
                <Scissors className="size-4" /> Split bundle
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Edit name
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function PriorityRow({ group, index, total }: { group: Group; index: number; total: number }) {
  const b = useBatch();
  const photo = useItemPhoto();
  const item = b.items.find((i) => i.id === group.itemIds[0]);
  const first = index < Math.ceil(total / 2);
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-line bg-surface p-3">
      <span className="w-6 text-center font-display text-lg font-extrabold text-ink-450">{index + 1}</span>
      <Thumb src={photo(item)} className="size-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold">{group.name}</p>
        <p className="text-sm text-ink-650">{item?.condition} condition</p>
      </div>
      <span className="hidden sm:block">
        <Badge tone={first ? "lime" : "neutral"}>{first ? "Move first" : "Backup"}</Badge>
      </span>
      <div className="flex gap-1">
        <button
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => b.reorderGroup(group.id, -1)}
          className="flex size-9 items-center justify-center rounded-lg border border-line disabled:opacity-30"
        >
          <ArrowUp className="size-4" />
        </button>
        <button
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => b.reorderGroup(group.id, 1)}
          className="flex size-9 items-center justify-center rounded-lg border border-line disabled:opacity-30"
        >
          <ArrowDown className="size-4" />
        </button>
      </div>
    </div>
  );
}
