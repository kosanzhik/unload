"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ClipboardCopy,
  FlaskConical,
  Inbox as InboxIcon,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  RefreshCw,
  Send,
  ShieldQuestion,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/chrome";
import { Badge, Button, Card, Empty, Help, Label, Modal, Note, Segmented, Thumb, timeAgo, useToast } from "@/components/ui";
import type { Conversation, Message, MarketplaceId } from "@/lib/core/types";
import { ADAPTERS } from "@/lib/marketplaces/registry";
import {
  approveMessage,
  discardMessage,
  createManualConversation,
  dismissTask,
  markConversationRead,
  nextDemoLine,
  receiveBuyerMessage,
  sendSellerMessage,
  startDemoConversation,
  submitVerification,
  syncMarketplaceThreads,
  useApp,
  useHydrated,
} from "@/lib/store";
import { cn } from "@/lib/util";

export default function InboxPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "tasks" ? "tasks" : "chats";
  const tasks = useApp((s) => s.tasks);
  const open = tasks.filter((t) => t.status === "open").length;
  if (!hydrated) return null;
  return (
    <>
      <PageHeader
        title="AI Inbox"
        sub="Every buyer conversation, what the agent replied, and what needs you."
        action={
          <Segmented
            value={tab}
            onChange={(v) => router.replace(v === "tasks" ? "/inbox?tab=tasks" : "/inbox")}
            options={[
              { value: "chats", label: "Conversations" },
              { value: "tasks", label: `Verification${open ? ` (${open})` : ""}` },
            ]}
          />
        }
      />
      {tab === "chats" ? <Chats /> : <Tasks />}
    </>
  );
}

/* ================================================================== */

function Chats() {
  const params = useSearchParams();
  const router = useRouter();
  const conversations = useApp((s) => s.conversations);
  const products = useApp((s) => s.products);
  const mode = useApp((s) => s.settings.mode);
  const olxConnected = useApp((s) => s.integrations.olx?.state === "connected");
  const [filter, setFilter] = useState<"all" | "needs">("all");
  const [newOpen, setNewOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  const sorted = useMemo(() => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt), [conversations]);
  const list = filter === "needs" ? sorted.filter((c) => c.messages.some((m) => m.status === "pending_approval")) : sorted;
  const selected = conversations.find((c) => c.id === params.get("c")) ?? list[0];

  useEffect(() => {
    if (selected) markConversationRead(selected.id);
  }, [selected]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className={cn("flex flex-col overflow-hidden lg:h-[calc(100dvh-210px)]", params.get("c") && "hidden lg:flex")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "needs", label: "Needs approval" },
            ]}
          />
          <div className="ml-auto flex gap-1">
            {olxConnected && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Sync OLX messages"
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const n = await syncMarketplaceThreads("olx");
                    toast(n ? `${n} new OLX message${n > 1 ? "s" : ""}` : "OLX is up to date");
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Sync failed");
                  } finally {
                    setSyncing(false);
                  }
                }}
              >
                {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setNewOpen(true)} aria-label="New conversation">
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {list.length === 0 && (
            <li>
              <Empty
                icon={<InboxIcon className="size-5" />}
                title={filter === "needs" ? "Nothing to approve" : "No conversations yet"}
                body={filter === "needs" ? "Replies waiting for you will show up here." : "Real OLX chats sync here once connected. You can also start a clearly labeled demo buyer."}
                action={filter === "all" && <Button onClick={() => setNewOpen(true)}>Start a conversation</Button>}
              />
            </li>
          )}
          {list.map((c) => {
            const p = products.find((x) => x.id === c.productId);
            const pending = c.messages.filter((m) => m.status === "pending_approval").length;
            const last = [...c.messages].reverse().find((m) => m.status !== "discarded");
            return (
              <li key={c.id}>
                <button
                  onClick={() => router.replace(`/inbox?c=${c.id}`)}
                  className={cn("flex w-full gap-3 border-b border-line p-3 text-left transition hover:bg-soft", selected?.id === c.id && "bg-brand-50/60")}
                >
                  <Thumb src={p?.photos[0]?.src} className="size-11 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", c.unread ? "font-bold" : "font-semibold")}>{c.buyerRef}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-ink-400">{timeAgo(c.updatedAt)}</span>
                    </span>
                    <span className="block truncate text-xs text-ink-500">{p?.title}</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      {c.demo ? <Badge tone="brand">Demo</Badge> : <Badge>{ADAPTERS[c.marketplace].name}</Badge>}
                      {pending > 0 && <Badge tone="warning">{pending} to approve</Badge>}
                      {!pending && last && <span className="truncate text-xs text-ink-400">{last.text}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {selected ? (
        <Thread key={selected.id} c={selected} mode={mode} />
      ) : (
        <Card className="hidden lg:block">
          <Empty icon={<Bot className="size-5" />} title="Pick a conversation" body="The agent's drafts and reasoning appear here." />
        </Card>
      )}

      <NewConversation open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function NewConversation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const products = useApp((s) => s.products);
  const listings = useApp((s) => s.listings);
  const [kind, setKind] = useState<"demo" | "manual">("demo");
  const [pid, setPid] = useState("");
  const [market, setMarket] = useState<MarketplaceId>("facebook");
  const [buyer, setBuyer] = useState("");

  const demoReady = products.filter((p) => listings.some((l) => l.productId === p.id && l.marketplace === "mock" && l.status === "active") && p.status !== "sold");
  const manualReady = products.filter((p) => listings.some((l) => l.productId === p.id && (l.status === "exported" || (l.status === "active" && !ADAPTERS[l.marketplace].capabilities.threads))));
  const options = kind === "demo" ? demoReady : manualReady;

  return (
    <Modal open={open} onClose={onClose} title="New conversation">
      <Segmented
        className="mb-4"
        value={kind}
        onChange={(k) => (setKind(k), setPid(""))}
        options={[
          { value: "demo", label: "Demo buyer" },
          { value: "manual", label: "Paste from a marketplace" },
        ]}
      />
      {kind === "demo" ? (
        <Note tone="brand">A scripted buyer on the simulated Demo Market. It&apos;s labeled “Demo” everywhere and never touches a real marketplace.</Note>
      ) : (
        <Note>For marketplaces without a messaging API (eBay, Facebook, Mercari): paste what the buyer wrote, get a policy-checked reply, and copy it back yourself.</Note>
      )}
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="nc-p">Product</Label>
          <select id="nc-p" className="field" value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Choose…</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {options.length === 0 && (
            <Help>
              {kind === "demo" ? "Publish a product to Demo Market first." : "Prepare a listing for manual posting first."}{" "}
              <Link href="/products/new" className="font-semibold text-brand">
                Add a product
              </Link>
            </Help>
          )}
        </div>
        {kind === "manual" && (
          <>
            <div>
              <Label htmlFor="nc-m">Marketplace</Label>
              <select id="nc-m" className="field" value={market} onChange={(e) => setMarket(e.target.value as MarketplaceId)}>
                {(["facebook", "ebay", "mercari", "olx"] as MarketplaceId[]).map((m) => (
                  <option key={m} value={m}>
                    {ADAPTERS[m].name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="nc-b">Buyer name</Label>
              <input id="nc-b" className="field" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="As shown on the marketplace" />
            </div>
          </>
        )}
      </div>
      <div className="mt-5 flex justify-end">
        <Button
          disabled={!pid}
          onClick={() => {
            let cid: string | null;
            if (kind === "demo") cid = startDemoConversation(pid);
            else cid = createManualConversation(pid, market, buyer.trim());
            onClose();
            if (cid) router.replace(`/inbox?c=${cid}`);
          }}
        >
          Start
        </Button>
      </div>
    </Modal>
  );
}

/* ================================================================== */

function Thread({ c, mode }: { c: Conversation; mode: string }) {
  const router = useRouter();
  const toast = useToast();
  const products = useApp((s) => s.products);
  const p = products.find((x) => x.id === c.productId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const manual = !c.demo && !c.externalThreadId;
  const next = c.demo ? nextDemoLine(c.id) : null;
  const visible = c.messages.filter((m) => m.status !== "discarded");
  const listRef = useRef<HTMLOListElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: mounted.current ? "smooth" : "auto" });
    mounted.current = true;
  }, [visible.length, busy]);

  async function buyerSays(t: string) {
    setBusy(true);
    try {
      await receiveBuyerMessage(c.id, t);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex min-h-[70vh] flex-col overflow-hidden lg:h-[calc(100dvh-210px)] lg:min-h-0">
      <div className="flex items-center gap-3 border-b border-line p-3 sm:px-5">
        <button onClick={() => router.replace("/inbox")} className="text-sm font-semibold text-brand lg:hidden">
          ← All
        </button>
        <Thumb src={p?.photos[0]?.src} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{c.buyerRef}</p>
          <Link href={`/products/${c.productId}`} className="block truncate text-xs text-ink-500 hover:text-brand">
            {p?.title} · {ADAPTERS[c.marketplace].name}
          </Link>
        </div>
        {c.demo ? <Badge tone="brand">Demo conversation</Badge> : manual ? <Badge>Manual relay</Badge> : <Badge tone="success">Live · {ADAPTERS[c.marketplace].name}</Badge>}
        <Badge className="hidden sm:inline-flex" dot tone={mode === "autopilot" ? "brand" : "neutral"}>
          {p?.agentEnabled === false ? "Agent off" : `${mode[0].toUpperCase()}${mode.slice(1)}`}
        </Badge>
      </div>

      <ol ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-canvas p-4 sm:p-5">
        {visible.length === 0 && <li className="py-10 text-center text-sm text-ink-500">No messages yet.</li>}
        {visible.map((m) => (
          <Bubble key={m.id} m={m} c={c} manual={manual} onCopy={() => navigator.clipboard.writeText(m.text).then(() => toast("Reply copied"))} />
        ))}
        {busy && (
          <li className="flex items-center gap-2 text-xs text-ink-500">
            <Loader2 className="size-3.5 animate-spin" /> Agent is checking facts and your rules…
          </li>
        )}
      </ol>

      {c.demo && (
        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-brand-100 bg-brand-50/50 px-4 py-2.5 text-xs sm:px-5">
          <FlaskConical className="size-3.5 text-brand" />
          <span className="text-brand-700">Demo buyer</span>
          {next ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => buyerSays(next)} className="ml-auto max-w-full">
              <span className="truncate">Send: “{next}”</span>
            </Button>
          ) : (
            <span className="ml-auto text-ink-500">Script finished — type as the buyer below.</span>
          )}
        </div>
      )}

      <div className="border-t border-line p-3 sm:p-4">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            setText("");
            if (c.demo || manual) await buyerSays(t);
            else await sendSellerMessage(c.id, t);
          }}
        >
          <input
            aria-label="Message"
            className="field"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={c.demo ? "Type as the demo buyer…" : manual ? "Paste the buyer's message…" : "Write to the buyer as yourself…"}
          />
          <Button type="submit" disabled={!text.trim() || busy} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
        <p className="mt-1.5 text-[11px] text-ink-400">
          {c.demo
            ? "You're playing the buyer. The agent responds using your rules and verified facts."
            : manual
              ? "Paste buyer messages here; copy approved replies back to the marketplace."
              : "Messages you write here are sent as you through the marketplace."}
        </p>
      </div>
    </Card>
  );
}

function Bubble({ m, c, manual, onCopy }: { m: Message; c: Conversation; manual: boolean; onCopy: () => void }) {
  const [draft, setDraft] = useState(m.text);
  const [why, setWhy] = useState(false);
  const mine = m.role !== "buyer";
  const pending = m.status === "pending_approval" && m.role === "agent";

  return (
    <li className={cn("animate-rise flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[88%] sm:max-w-[75%]", pending && "w-full sm:w-[75%]")}>
        <p className={cn("mb-1 flex items-center gap-1.5 text-[11px] font-semibold", mine ? "justify-end text-ink-500" : "text-ink-500")}>
          {m.role === "agent" ? <Bot className="size-3.5 text-brand" /> : <User className="size-3.5" />}
          {m.role === "agent" ? "AI agent" : m.role === "seller" ? "You" : c.buyerRef}
          <span className="font-normal text-ink-400">· {timeAgo(m.createdAt)}</span>
        </p>
        {pending ? (
          <div className="rounded-2xl border-2 border-warning/40 bg-surface p-3 shadow-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <ShieldQuestion className="size-3.5" /> Waiting for your approval
            </p>
            <textarea aria-label="Draft reply" className="field min-h-20 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
            {m.rationale && <p className="mt-2 text-xs text-ink-500">Why: {m.rationale}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => discardMessage(c.id, m.id)}>
                Discard
              </Button>
              <Button size="sm" onClick={() => approveMessage(c.id, m.id, draft.trim() || m.text).then(() => manual && onCopy())}>
                <Send className="size-3.5" /> {manual ? "Approve & copy" : "Approve & send"}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
              m.role === "buyer" && "rounded-tl-md border border-line bg-surface",
              m.role === "agent" && "rounded-tr-md bg-brand text-white",
              m.role === "seller" && "rounded-tr-md bg-ink-900 text-white",
              m.status === "failed" && "bg-error-50 text-error",
            )}
          >
            {m.text}
          </div>
        )}
        {!pending && m.role !== "buyer" && (
          <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-ink-400">
            {m.status === "failed" && <span className="text-error">Not delivered</span>}
            {m.status === "sent" && <span>{c.demo ? "Sent (demo)" : manual ? "Approved — copy to marketplace" : "Sent"}</span>}
            {manual && m.status === "sent" && (
              <button onClick={onCopy} className="inline-flex items-center gap-1 font-semibold text-brand">
                <ClipboardCopy className="size-3" /> Copy
              </button>
            )}
            {m.rationale && (
              <button onClick={() => setWhy((w) => !w)} className="font-semibold text-brand">
                {why ? "Hide reasoning" : "Why?"}
              </button>
            )}
          </div>
        )}
        {why && m.rationale && <p className="mt-1 rounded-lg bg-soft p-2 text-xs text-ink-500">{m.rationale}</p>}
      </div>
    </li>
  );
}

/* ================================================================== */

function Tasks() {
  const tasks = useApp((s) => s.tasks);
  const products = useApp((s) => s.products);
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done").slice(0, 10);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      {open.length === 0 && (
        <Card className="lg:col-span-2">
          <Empty icon={<ShieldQuestion className="size-5" />} title="No open checks" body="When a buyer asks something that isn't verified yet, the agent says so honestly and asks you here." />
        </Card>
      )}
      {open.map((t) => (
        <TaskCard key={t.id} taskId={t.id} title={products.find((p) => p.id === t.productId)?.title ?? "Product"} question={t.question} instruction={t.instruction} />
      ))}
      {done.length > 0 && (
        <Card className="lg:col-span-2">
          <p className="border-b border-line px-5 py-3 text-sm font-semibold">Recently verified</p>
          <ul className="divide-y divide-line">
            {done.map((t) => {
              const p = products.find((x) => x.id === t.productId);
              const f = p?.facts.find((x) => x.id === t.factId);
              return (
                <li key={t.id} className="px-5 py-3 text-sm">
                  <span className="font-semibold">{t.question}</span> <span className="text-ink-500">— {f?.answer ?? "answered"}</span>
                  <span className="block text-xs text-ink-400">{p?.title}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TaskCard({ taskId, title, question, instruction }: { taskId: string; title: string; question: string; instruction: string }) {
  const toast = useToast();
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inListing, setInListing] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-5">
      <Badge tone="warning" dot>
        Verification needed
      </Badge>
      <p className="mt-3 font-display text-lg font-bold">{question}</p>
      <p className="mt-1 text-sm text-ink-500">{instruction}</p>
      <p className="mt-1 text-xs text-ink-400">{title}</p>
      <div className="mt-4 space-y-3">
        <textarea aria-label="Your answer" className="field min-h-20" placeholder="What did you find? e.g. “Yes — tested with a laptop, the HDMI port works.”" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-ink-500 hover:border-brand">
          <Paperclip className="size-4" />
          <span className="truncate">{file ? file.name : "Attach a photo or short video (optional)"}</span>
          <input type="file" accept="image/*,video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand" checked={inListing} onChange={(e) => setInListing(e.target.checked)} />
          Suggest adding this to the listing
        </label>
        <Help>Evidence shows the item at the time you recorded it — the agent never presents it as a guarantee.</Help>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => dismissTask(taskId)}>
          Dismiss
        </Button>
        <Button
          disabled={!answer.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await submitVerification(taskId, { answer, file: file ?? undefined, inListing });
            toast("Verified — the agent will use this from now on");
          }}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Save verified answer
        </Button>
      </div>
    </Card>
  );
}
