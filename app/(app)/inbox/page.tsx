"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Bot, ClipboardCopy, FlaskConical, HandCoins, Inbox as InboxIcon, Loader2, MessageSquarePlus, RefreshCw, Send, ShieldQuestion, User } from "lucide-react";
import { OfferCard } from "@/components/offer-card";
import { Badge, Button, Card, Empty, Help, Label, Modal, Note, Segmented, Thumb, timeAgo, useToast } from "@/components/ui";
import type { Conversation, MarketplaceId, Message, Offer, Product } from "@/lib/core/types";
import { ADAPTERS } from "@/lib/marketplaces/registry";
import {
  answerQuestion,
  approveMessage,
  createManualConversation,
  discardMessage,
  dismissQuestion,
  markConversationRead,
  nextDemoLine,
  receiveBuyerMessage,
  sendSellerMessage,
  startDemoConversation,
  syncMarketplaceThreads,
  useApp,
  useHydrated,
} from "@/lib/store";
import { cn } from "@/lib/util";

type Tab = "chats" | "offers" | "questions";

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
  const tab: Tab = params.get("tab") === "offers" ? "offers" : params.get("tab") === "questions" ? "questions" : "chats";
  const offers = useApp((s) => s.offers);
  const questions = useApp((s) => s.questions);
  const pendingOffers = offers.filter((o) => o.status === "pending").length;
  const openQs = questions.filter((q) => q.status === "open").length;
  if (!hydrated) return null;
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">AI Inbox</h1>
          <p className="mt-1 text-ink-500">Your AI handles routine messages. Only decisions reach you.</p>
        </div>
        <Segmented<Tab>
          value={tab}
          onChange={(v) => router.replace(v === "chats" ? "/inbox" : `/inbox?tab=${v}`)}
          options={[
            { value: "chats", label: "Conversations" },
            { value: "offers", label: `Offers${pendingOffers ? ` (${pendingOffers})` : ""}` },
            { value: "questions", label: `For you${openQs ? ` (${openQs})` : ""}` },
          ]}
        />
      </div>
      {tab === "chats" && <Chats />}
      {tab === "offers" && <Offers />}
      {tab === "questions" && <Questions />}
    </>
  );
}

/* ================================================================== */
/* Conversations                                                      */
/* ================================================================== */

function Chats() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const conversations = useApp((s) => s.conversations);
  const products = useApp((s) => s.products);
  const integrations = useApp((s) => s.integrations);
  const [newOpen, setNewOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncable = (["olx", "reverb"] as MarketplaceId[]).filter((m) => integrations[m]?.state === "connected");

  const list = useMemo(() => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt), [conversations]);
  const selected = conversations.find((c) => c.id === params.get("c")) ?? list[0];

  useEffect(() => {
    if (selected) markConversationRead(selected.id);
  }, [selected]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className={cn("flex flex-col overflow-hidden lg:h-[calc(100dvh-210px)]", params.get("c") && "hidden lg:flex")}>
        <div className="flex items-center gap-2 border-b border-line p-3">
          <p className="text-sm font-semibold">
            {list.length} conversation{list.length === 1 ? "" : "s"}
          </p>
          <div className="ml-auto flex gap-1">
            {syncable.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Check marketplaces for new messages"
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const n = (await Promise.all(syncable.map((m) => syncMarketplaceThreads(m)))).reduce((a, b) => a + b, 0);
                    toast(n ? `${n} new message${n > 1 ? "s" : ""}` : "Up to date");
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
            <Button size="sm" variant="secondary" onClick={() => setNewOpen(true)}>
              <MessageSquarePlus className="size-4" /> New
            </Button>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {list.length === 0 && (
            <li>
              <Empty
                icon={<InboxIcon className="size-5" />}
                title="No conversations yet"
                body="Buyer messages from connected marketplaces appear here. You can also start a clearly labeled demo buyer."
                action={<Button onClick={() => setNewOpen(true)}>Start a conversation</Button>}
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
                      {pending > 0 ? <Badge tone="warning">Needs OK</Badge> : last && <span className="truncate text-xs text-ink-400">{last.text}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {selected ? (
        <Thread key={selected.id} c={selected} p={products.find((x) => x.id === selected.productId)} />
      ) : (
        <Card className="hidden lg:block">
          <Empty icon={<Bot className="size-5" />} title="Pick a conversation" body="The AI's replies and its reasoning appear here." />
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
  const demoReady = products.filter((p) => p.status !== "sold" && listings.some((l) => l.productId === p.id && l.marketplace === "mock" && l.status === "active"));
  const manualReady = products.filter(
    (p) => p.status !== "sold" && listings.some((l) => l.productId === p.id && l.status !== "draft" && !ADAPTERS[l.marketplace].capabilities.threads),
  );
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
      <Note tone={kind === "demo" ? "brand" : "neutral"}>
        {kind === "demo"
          ? "A simulated buyer on the built-in demo marketplace. Labeled “Demo” everywhere — never a real person."
          : "For marketplaces without a messaging API (e.g. Facebook Marketplace): paste what the buyer wrote, get a reply that follows your rules, copy it back."}
      </Note>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="nc-p">Item</Label>
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
              {kind === "demo" ? "Activate Autopilot on an item with the demo marketplace first." : "Prepare a listing for manual posting first."}{" "}
              <Link href="/sell" className="font-semibold text-brand">
                Sell an item
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
              <input id="nc-b" className="field" value={buyer} onChange={(e) => setBuyer(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className="mt-5 flex justify-end">
        <Button
          disabled={!pid}
          onClick={() => {
            const cid = kind === "demo" ? startDemoConversation(pid) : createManualConversation(pid, market, buyer.trim());
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

function Thread({ c, p }: { c: Conversation; p?: Product }) {
  const router = useRouter();
  const toast = useToast();
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
          <Link href={`/items/${c.productId}`} className="block truncate text-xs text-ink-500 hover:text-brand">
            {p?.title} · {ADAPTERS[c.marketplace].name}
          </Link>
        </div>
        {c.demo ? <Badge tone="brand">Simulated buyer</Badge> : manual ? <Badge>Manual relay</Badge> : <Badge tone="success">Live</Badge>}
        <Badge className="hidden sm:inline-flex" tone={p?.autopilot ? "brand" : "neutral"} dot>
          {p?.autopilot ? "Autopilot" : "Needs your OK"}
        </Badge>
      </div>

      <ol ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-canvas p-4 sm:p-5">
        {visible.length === 0 && <li className="py-10 text-center text-sm text-ink-500">No messages yet.</li>}
        {visible.map((m) => (
          <Bubble key={m.id} m={m} c={c} manual={manual} onCopy={() => navigator.clipboard.writeText(m.text).then(() => toast("Reply copied"))} />
        ))}
        {busy && (
          <li className="flex items-center gap-2 text-xs text-ink-500">
            <Loader2 className="size-3.5 animate-spin" /> AI is checking your rules and what it knows…
          </li>
        )}
      </ol>

      {c.demo && (
        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-brand-100 bg-brand-50/50 px-4 py-2.5 text-xs sm:px-5">
          <FlaskConical className="size-3.5 text-brand" />
          <span className="text-brand-700">Simulated buyer</span>
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
            placeholder={c.demo ? "Type as the simulated buyer…" : manual ? "Paste the buyer's message…" : "Write to the buyer as yourself…"}
          />
          <Button type="submit" disabled={!text.trim() || busy} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
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
        <p className={cn("mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-ink-500", mine && "justify-end")}>
          {m.role === "agent" ? <Bot className="size-3.5 text-brand" /> : <User className="size-3.5" />}
          {m.role === "agent" ? "Your AI seller" : m.role === "seller" ? "You" : c.buyerRef}
          <span className="font-normal text-ink-400">· {timeAgo(m.createdAt)}</span>
        </p>
        {pending ? (
          <div className="rounded-2xl border-2 border-warning/40 bg-surface p-3 shadow-sm">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <ShieldQuestion className="size-3.5" /> Waiting for your OK (Autopilot is off)
            </p>
            <textarea aria-label="Draft reply" className="field min-h-20 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
            {m.rationale && <p className="mt-2 text-xs text-ink-500">Why: {m.rationale}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => discardMessage(c.id, m.id)}>
                Discard
              </Button>
              <Button size="sm" onClick={() => approveMessage(c.id, m.id, draft.trim() || m.text).then(() => manual && onCopy())}>
                <Send className="size-3.5" /> {manual ? "Approve & copy" : "Send"}
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
            {m.status === "sent" && <span>{c.demo ? "Sent (demo)" : manual ? "Copy to the marketplace" : "Sent"}</span>}
            {manual && m.status === "sent" && (
              <button onClick={onCopy} className="inline-flex items-center gap-1 font-semibold text-brand">
                <ClipboardCopy className="size-3" /> Copy
              </button>
            )}
            {m.rationale && (
              <button onClick={() => setWhy((w) => !w)} className="font-semibold text-brand">
                {why ? "Hide" : "Why?"}
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
/* Buyer offers                                                       */
/* ================================================================== */

function Offers() {
  const offers = useApp((s) => s.offers);
  const groups: [string, Offer[]][] = [
    ["Needs your decision", offers.filter((o) => o.status === "pending")],
    ["Accepted — waiting for the handoff", offers.filter((o) => o.status === "accepted")],
    ["Closed", offers.filter((o) => ["rejected", "countered", "sold"].includes(o.status)).slice(0, 10)],
  ];
  if (!offers.length)
    return (
      <Card>
        <Empty icon={<HandCoins className="size-5" />} title="No offers yet" body="When a buyer is ready to buy or wants to meet, the AI brings the offer here for your decision." />
      </Card>
    );
  return (
    <div className="space-y-8">
      {groups.map(([title, list]) =>
        list.length ? (
          <section key={title}>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-ink-500 uppercase">{title}</h2>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
              {list.map((o) => (
                <OfferCard key={o.id} o={o} />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}

/* ================================================================== */
/* Questions only the seller can answer                               */
/* ================================================================== */

function Questions() {
  const questions = useApp((s) => s.questions);
  const products = useApp((s) => s.products);
  const open = questions.filter((q) => q.status === "open");
  if (!open.length)
    return (
      <Card>
        <Empty icon={<ShieldQuestion className="size-5" />} title="Nothing needs you" body="When a buyer asks something the AI can't confirm, it says so honestly and asks you here." />
      </Card>
    );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
      {open.map((q) => (
        <QuestionCard key={q.id} id={q.id} question={q.question} buyer={q.buyerQuestion} item={products.find((p) => p.id === q.productId)?.title ?? ""} />
      ))}
    </div>
  );
}

function QuestionCard({ id, question, buyer, item }: { id: string; question: string; buyer: string; item: string }) {
  const toast = useToast();
  const [answer, setAnswer] = useState("");
  const [inListing, setInListing] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-ink-500">{item}</p>
      <p className="mt-1 font-display text-lg font-bold">{question}</p>
      <p className="mt-1 text-sm text-ink-500">Buyer asked: “{buyer}”</p>
      <textarea
        aria-label="Your answer"
        className="field mt-4 min-h-20"
        placeholder="Your answer — the AI replies to the buyer and remembers it"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-brand" checked={inListing} onChange={(e) => setInListing(e.target.checked)} />
        Add to the listing so other buyers see it
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => dismissQuestion(id)}>
          Skip
        </Button>
        <Button
          disabled={!answer.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await answerQuestion(id, answer, inListing);
            toast("Answered — the AI replied to the buyer");
          }}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Answer
        </Button>
      </div>
    </Card>
  );
}
