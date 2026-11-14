"use client";

import { useSyncExternalStore } from "react";
import { decide, needsApproval, type AgentDecision } from "./agent/salesAgent";
import type {
  AutopilotSettings,
  Conversation,
  DealRequest,
  Evidence,
  Fact,
  IntegrationState,
  Listing,
  MarketplaceId,
  Message,
  Notification,
  Product,
  VerificationTask,
} from "./core/types";
import { putFile } from "./evidence";
import { knowledgeSheet } from "./knowledge/kb";
import { listingDescription, listingTitle } from "./listing/drafts";
import { ADAPTERS, connectReverbToken, draftListing, ebayContext, mockAdapter, olxContext } from "./marketplaces/registry";
import type { IntegrationStatus } from "./marketplaces/types";
import { guardReply, money, parseOffer } from "./negotiation/policy";
import { uid } from "./util";
import { SAMPLES } from "./vision/demo";

/* ================================================================== */
/* State                                                              */
/* ================================================================== */

export type Settings = AutopilotSettings & {
  city: string;
  contactName: string;
  phone: string;
  usCity: string;
  usState: string;
  usZip: string;
};

export type AppState = {
  products: Product[];
  listings: Listing[];
  conversations: Conversation[];
  tasks: VerificationTask[];
  deals: DealRequest[];
  notifications: Notification[];
  settings: Settings;
  integrations: Partial<Record<MarketplaceId, IntegrationStatus>>;
  ai: { claude: boolean; model: string | null; checked: boolean };
};

export const DEFAULT_SETTINGS: Settings = {
  mode: "assisted",
  allowedReplies: { availability: true, condition: true, logistics: true, pricing: false },
  pickup: true,
  shipping: false,
  meetingArea: "",
  escalation: { paymentQuestions: true, offPlatformContact: true, repeatedLowOffers: true },
  notifications: { browser: false, dealRequests: true, verificationTasks: true, approvals: true },
  city: "Алматы",
  contactName: "",
  phone: "",
  usCity: "",
  usState: "",
  usZip: "",
};

const EMPTY: AppState = {
  products: [],
  listings: [],
  conversations: [],
  tasks: [],
  deals: [],
  notifications: [],
  settings: DEFAULT_SETTINGS,
  integrations: {},
  ai: { claude: false, model: null, checked: false },
};

const KEY = "unload:autopilot:v1";
let state: AppState = EMPTY;
const listeners = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<AppState>;
      state = { ...EMPTY, ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings }, integrations: {}, ai: EMPTY.ai };
    }
  } catch {}
  applyContexts();
}

function applyContexts() {
  const st = state.settings;
  Object.assign(olxContext, { city: st.city, contactName: st.contactName, phone: st.phone });
  Object.assign(ebayContext, { city: st.usCity, stateOrProvince: st.usState, postalCode: st.usZip, country: "US" });
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, integrations: undefined, ai: undefined }));
    } catch {
      // storage full (many photos) — the session keeps working in memory
    }
  }, 150);
}

export function getState() {
  load();
  return state;
}

function set(fn: (s: AppState) => Partial<AppState>) {
  load();
  state = { ...state, ...fn(state) };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(getState()), () => select(EMPTY));
}

/** false during SSR / hydration, true once local data is available */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/* ================================================================== */
/* Helpers                                                            */
/* ================================================================== */

const now = () => Date.now();
const product = (id: string) => getState().products.find((p) => p.id === id);
const convo = (id: string) => getState().conversations.find((c) => c.id === id);

function patchProduct(id: string, fn: (p: Product) => Partial<Product>) {
  set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) }));
}
function patchConvo(id: string, fn: (c: Conversation) => Partial<Conversation>) {
  set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, ...fn(c), updatedAt: now() } : c)) }));
}
function patchListing(id: string, data: Partial<Listing>) {
  set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, ...data } : l)) }));
}
function patchMessage(cid: string, mid: string, data: Partial<Message>) {
  patchConvo(cid, (c) => ({ messages: c.messages.map((m) => (m.id === mid ? { ...m, ...data } : m)) }));
}

export function notify(n: Omit<Notification, "id" | "createdAt" | "read">) {
  set((s) => ({ notifications: [{ ...n, id: uid("n"), createdAt: now(), read: false }, ...s.notifications].slice(0, 100) }));
  const st = getState().settings.notifications;
  if (st.browser && typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(n.title, { body: n.body });
    } catch {}
  }
}

/* ================================================================== */
/* Settings, AI & integrations                                        */
/* ================================================================== */

export function updateSettings(patch: Partial<Settings>) {
  set((s) => ({ settings: { ...s.settings, ...patch } }));
  applyContexts();
}

export async function checkAi() {
  try {
    const r = await fetch("/api/ai/status").then((r) => r.json());
    set(() => ({ ai: { claude: Boolean(r.claude), model: r.model ?? null, checked: true } }));
  } catch {
    set(() => ({ ai: { claude: false, model: null, checked: true } }));
  }
}

export async function refreshIntegrations() {
  const entries = await Promise.all(
    Object.values(ADAPTERS).map(async (a) => {
      try {
        return [a.id, await a.status()] as const;
      } catch (e) {
        return [a.id, { state: "unavailable" as IntegrationState, detail: e instanceof Error ? e.message : "Status unavailable" }] as const;
      }
    }),
  );
  set(() => ({ integrations: Object.fromEntries(entries) }));
}

export async function connectMarketplace(id: MarketplaceId) {
  await ADAPTERS[id].connect();
  await refreshIntegrations();
}
export async function connectReverb(token: string, env: "production" | "sandbox") {
  const r = await connectReverbToken(token, env);
  await refreshIntegrations();
  return r;
}

export async function disconnectMarketplace(id: MarketplaceId) {
  await ADAPTERS[id].disconnect();
  await refreshIntegrations();
}

/* ================================================================== */
/* Products & Living Listing                                          */
/* ================================================================== */

export function createProduct(p: Omit<Product, "id" | "createdAt">) {
  const id = uid("p");
  set((s) => ({ products: [{ ...p, id, createdAt: now() }, ...s.products] }));
  return id;
}

export function updateProduct(id: string, patch: Partial<Product>) {
  patchProduct(id, () => patch);
}

export function deleteProduct(id: string) {
  set((s) => ({
    products: s.products.filter((p) => p.id !== id),
    listings: s.listings.filter((l) => l.productId !== id),
    conversations: s.conversations.filter((c) => c.productId !== id),
    tasks: s.tasks.filter((t) => t.productId !== id),
    deals: s.deals.filter((d) => d.productId !== id),
  }));
}

export function makeFact(data: Pick<Fact, "topic" | "question" | "answer" | "source" | "inListing"> & { evidenceIds?: string[] }): Fact {
  return { id: uid("f"), createdAt: now(), evidenceIds: [], ...data };
}

export function addFact(productId: string, fact: Fact) {
  patchProduct(productId, (p) => ({ facts: [...p.facts.filter((f) => f.topic !== fact.topic || f.question !== fact.question), fact] }));
}

export function removeFact(productId: string, factId: string) {
  patchProduct(productId, (p) => ({ facts: p.facts.filter((f) => f.id !== factId) }));
}

/** Rebuild listing text for a product; pushes the change to live listings where the adapter supports it. */
export async function syncListingText(productId: string) {
  const p = product(productId);
  if (!p) return;
  const ls = getState().listings.filter((l) => l.productId === productId);
  for (const l of ls) {
    const next = { title: listingTitle(p, l.marketplace), description: listingDescription(p, l.marketplace), price: p.pricing.desired };
    patchListing(l.id, next);
    const adapter = ADAPTERS[l.marketplace];
    if (l.externalId && adapter.capabilities.update && (l.status === "active" || l.status === "moderation")) {
      try {
        await adapter.update({ ...l, ...next }, p);
      } catch (e) {
        patchListing(l.id, { note: `Update failed: ${e instanceof Error ? e.message : "error"}` });
      }
    }
  }
}

export async function approveListingUpdate(productId: string, updateId: string) {
  const p = product(productId);
  const u = p?.pendingListingUpdates.find((x) => x.id === updateId);
  if (!p || !u) return;
  patchProduct(productId, (pp) => ({
    facts: pp.facts.map((f) => (f.id === u.factId ? { ...f, inListing: true } : f)),
    pendingListingUpdates: pp.pendingListingUpdates.filter((x) => x.id !== updateId),
  }));
  await syncListingText(productId);
}

export function dismissListingUpdate(productId: string, updateId: string) {
  patchProduct(productId, (p) => ({ pendingListingUpdates: p.pendingListingUpdates.filter((x) => x.id !== updateId) }));
}

/* ================================================================== */
/* Listings                                                           */
/* ================================================================== */

export function prepareListings(productId: string, markets: MarketplaceId[]) {
  const p = product(productId);
  if (!p) return;
  const existing = new Set(getState().listings.filter((l) => l.productId === productId).map((l) => l.marketplace));
  const fresh = markets.filter((m) => !existing.has(m)).map((m) => draftListing(p, m));
  set((s) => ({ listings: [...s.listings, ...fresh] }));
  if (p.status === "draft") patchProduct(productId, () => ({ status: "ready" }));
}

export function updateListing(id: string, patch: Partial<Listing>) {
  patchListing(id, patch);
}

export function removeListing(id: string) {
  set((s) => ({ listings: s.listings.filter((l) => l.id !== id) }));
}

/** Upload browser-only photos to public hosting (only at publish time, for API marketplaces). */
async function hostPhotos(productId: string): Promise<Product | undefined> {
  const p = product(productId);
  if (!p || !p.photos.some((ph) => ph.src.startsWith("data:"))) return p;
  const photos = await Promise.all(
    p.photos.map(async (ph) => {
      if (!ph.src.startsWith("data:")) return ph;
      try {
        const r = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: ph.src, name: ph.name }),
        });
        const j = await r.json();
        return r.ok && j.url ? { ...ph, src: j.url as string } : ph;
      } catch {
        return ph;
      }
    }),
  );
  patchProduct(productId, () => ({ photos }));
  return product(productId);
}

export async function publishListing(id: string) {
  const l = getState().listings.find((x) => x.id === id);
  let p = l && product(l.productId);
  if (!l || !p) return;
  patchListing(id, { status: "publishing", note: undefined });
  try {
    if (ADAPTERS[l.marketplace].capabilities.publish && l.marketplace !== "mock") p = (await hostPhotos(p.id)) ?? p;
    const r = await ADAPTERS[l.marketplace].publish(l, p);
    patchListing(id, { ...r, publishedAt: now() });
    patchProduct(p.id, () => ({ status: "listed" }));
    notify({
      kind: "listing",
      title: r.status === "exported" ? `Ready to post on ${ADAPTERS[l.marketplace].name}` : `Published on ${ADAPTERS[l.marketplace].name}`,
      body: r.note ?? p.title,
      href: `/products/${p.id}`,
    });
  } catch (e) {
    patchListing(id, { status: "error", note: e instanceof Error ? e.message : "Publishing failed" });
  }
}

export function markExportedPosted(id: string, url: string) {
  patchListing(id, { status: "active", url: url || undefined, publishedAt: now(), note: "Posted manually by you." });
}

export async function refreshListing(id: string) {
  const l = getState().listings.find((x) => x.id === id);
  if (!l) return;
  try {
    patchListing(id, await ADAPTERS[l.marketplace].readStatus(l));
  } catch (e) {
    patchListing(id, { note: e instanceof Error ? e.message : "Status check failed" });
  }
}

export async function setListingAvailability(id: string, active: boolean, soldHere?: boolean) {
  const l = getState().listings.find((x) => x.id === id);
  if (!l) return;
  try {
    const status = await ADAPTERS[l.marketplace].setAvailability(l, active, soldHere);
    patchListing(id, { status });
  } catch (e) {
    patchListing(id, { note: e instanceof Error ? e.message : "Couldn't change availability" });
  }
}

/* ================================================================== */
/* AI Sales Agent pipeline                                            */
/* ================================================================== */

async function phrase(d: AgentDecision, p: Product, c: Conversation, buyerText: string) {
  if (!getState().ai.claude) return { text: d.reply, phrased: false };
  try {
    const r = await fetch("/api/ai/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerMessage: buyerText,
        approvedReply: d.reply,
        facts: knowledgeSheet(p),
        history: c.messages.filter((m) => m.status === "sent" || m.status === "received").map((m) => ({ role: m.role, text: m.text })),
      }),
    }).then((r) => r.json());
    const candidate = typeof r.reply === "string" ? r.reply : "";
    if (candidate && guardReply(candidate, p.pricing, d.allowedAmounts).ok) return { text: candidate, phrased: true };
  } catch {}
  return { text: d.reply, phrased: false };
}

async function deliver(cid: string, mid: string) {
  const c = convo(cid);
  const m = c?.messages.find((x) => x.id === mid);
  if (!c || !m) return;
  if (c.demo || !c.externalThreadId) {
    patchMessage(cid, mid, { status: "sent" });
    return;
  }
  try {
    const r = await ADAPTERS[c.marketplace].sendMessage(c.externalThreadId, m.text);
    patchMessage(cid, mid, { status: "sent", externalId: r.id });
  } catch (e) {
    patchMessage(cid, mid, { status: "failed", rationale: `${m.rationale ?? ""} Send failed: ${e instanceof Error ? e.message : "error"}`.trim() });
  }
}

/** Runs the agent on a new buyer message: knowledge lookup → policy → reply/approval → tasks/deals/notifications. */
export async function agentHandle(cid: string, buyerText: string, opts: { followUp?: boolean } = {}) {
  const c = convo(cid);
  const p = c && product(c.productId);
  if (!c || !p) return;
  const base = getState().settings;
  // Agent off for this product → everything waits for the seller.
  const settings = p.agentEnabled ? base : { ...base, mode: "manual" as const };
  const d = decide(p, c, buyerText, settings);
  if (opts.followUp) {
    // Answering an earlier question after the seller verified it: no new deals or tasks.
    d.deal = undefined;
    d.task = undefined;
    d.reply = `Update on your question (“${buyerText.trim()}”): ${d.reply}`;
  }
  const { text, phrased } = await phrase(d, p, c, buyerText);
  const approval = needsApproval(d, settings, p.pricing.negotiationEnabled);
  const mid = uid("m");

  patchConvo(cid, (cc) => ({
    lowOfferCount: cc.lowOfferCount + (d.lowOffer ? 1 : 0),
    messages: [
      ...cc.messages,
      {
        id: mid,
        role: "agent",
        text,
        status: approval ? "pending_approval" : "sent",
        createdAt: now(),
        category: d.category,
        rationale: `${d.rationale}${phrased ? " Worded by Claude, checked by the price guard." : ""}`,
      },
    ],
  }));
  if (!approval) await deliver(cid, mid);

  if (d.task) {
    const existing = getState().tasks.find((t) => t.productId === p.id && t.topic === d.task!.topic && t.status === "open");
    if (!existing) {
      set((s) => ({
        tasks: [{ id: uid("t"), productId: p.id, conversationId: cid, buyerQuestion: buyerText, status: "open", createdAt: now(), ...d.task! }, ...s.tasks],
      }));
      if (settings.notifications.verificationTasks)
        notify({ kind: "verification", title: "A buyer asked something we can't verify", body: d.task.question, href: "/inbox?tab=tasks" });
    }
  }

  if (d.deal) {
    const verified = p.facts.length === 0 ? "unverified" : p.sellerQuestions.every((q) => q.answer) ? "verified" : "partially_verified";
    const deal: DealRequest = {
      id: uid("d"),
      productId: p.id,
      conversationId: cid,
      marketplace: c.marketplace,
      buyerRef: c.buyerRef,
      kind: d.deal.kind,
      offeredPrice: d.deal.offeredPrice,
      currency: p.pricing.currency,
      conditions: d.deal.conditions || "To be agreed",
      summary: summarize(c, buyerText),
      verification: verified,
      approval: "pending",
      createdAt: now(),
    };
    set((s) => ({ deals: [deal, ...s.deals] }));
    if (settings.notifications.dealRequests)
      notify({
        kind: "deal",
        title: d.deal.kind === "inspection" ? "A buyer wants to see the item" : "A buyer is ready to proceed",
        body: `${p.title} · ${money(deal.offeredPrice, deal.currency)}`,
        href: "/deals",
      });
  }

  if (d.escalate) notify({ kind: "approval", title: d.escalate, body: `${p.title} · “${buyerText.slice(0, 80)}”`, href: `/inbox?c=${cid}` });
  else if (approval && settings.notifications.approvals)
    notify({ kind: "approval", title: "Reply waiting for your approval", body: `${p.title} · “${buyerText.slice(0, 80)}”`, href: `/inbox?c=${cid}` });
}

function summarize(c: Conversation, latest: string) {
  const buyer = [...c.messages.filter((m) => m.role === "buyer").map((m) => m.text), latest];
  const offers = buyer.map(parseOffer).filter((n): n is number => n != null);
  const asked = buyer.filter((t) => t.includes("?")).slice(-2);
  return [
    `${buyer.length} buyer message${buyer.length > 1 ? "s" : ""}.`,
    offers.length ? `Offers mentioned: ${offers.join(", ")}.` : "",
    asked.length ? `Asked: ${asked.map((a) => `“${a}”`).join(" ")}` : "",
    `Latest: “${latest}”`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function receiveBuyerMessage(cid: string, text: string, externalId?: string) {
  patchConvo(cid, (c) => ({
    unread: true,
    messages: [...c.messages, { id: uid("m"), role: "buyer", text, status: "received", createdAt: now(), externalId }],
  }));
  await agentHandle(cid, text);
}

export async function approveMessage(cid: string, mid: string, text: string) {
  patchMessage(cid, mid, { text, status: "sent" });
  const c = convo(cid);
  if (c && !c.demo && c.externalThreadId) {
    patchMessage(cid, mid, { status: "pending_approval" });
    await deliver(cid, mid);
  }
}

export function discardMessage(cid: string, mid: string) {
  patchMessage(cid, mid, { status: "discarded" });
}

export async function sendSellerMessage(cid: string, text: string) {
  const mid = uid("m");
  patchConvo(cid, (c) => ({ messages: [...c.messages, { id: mid, role: "seller", text, status: "pending_approval", createdAt: now() }] }));
  await deliver(cid, mid);
}

export function markConversationRead(cid: string) {
  if (convo(cid)?.unread) patchConvo(cid, () => ({ unread: false }));
}

/* ================================================================== */
/* Proof-to-Deal: verification                                        */
/* ================================================================== */

export async function submitVerification(
  taskId: string,
  input: { answer: string; file?: File; inListing: boolean },
) {
  const t = getState().tasks.find((x) => x.id === taskId);
  if (!t) return;
  const evidence: Evidence[] = [];
  if (input.file) {
    const blobKey = uid("ev");
    await putFile(blobKey, input.file);
    evidence.push({
      id: uid("e"),
      kind: input.file.type.startsWith("video/") ? "video" : "photo",
      fileName: input.file.name,
      mime: input.file.type,
      size: input.file.size,
      blobKey,
      createdAt: now(),
    });
  }
  const fact = makeFact({
    topic: t.topic,
    question: t.question,
    answer: input.answer.trim(),
    source: evidence.length ? "evidence" : "seller",
    inListing: false,
    evidenceIds: evidence.map((e) => e.id),
  });
  patchProduct(t.productId, (p) => ({
    evidence: [...p.evidence, ...evidence],
    facts: [...p.facts.filter((f) => f.topic !== fact.topic), fact],
    pendingListingUpdates: input.inListing
      ? [...p.pendingListingUpdates, { id: uid("u"), factId: fact.id, text: fact.answer }]
      : p.pendingListingUpdates,
  }));
  set((s) => ({ tasks: s.tasks.map((x) => (x.id === taskId ? { ...x, status: "done", factId: fact.id } : x)) }));

  // Follow up with the buyer who asked, using the newly verified knowledge.
  const c = t.conversationId && convo(t.conversationId);
  if (c && t.buyerQuestion) await agentHandle(c.id, t.buyerQuestion, { followUp: true });
}

export function dismissTask(taskId: string) {
  set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: "dismissed" } : t)) }));
}

/* ================================================================== */
/* Deal Center                                                        */
/* ================================================================== */

export async function decideDeal(dealId: string, approve: boolean, note: string) {
  const d = getState().deals.find((x) => x.id === dealId);
  if (!d) return;
  set((s) => ({ deals: s.deals.map((x) => (x.id === dealId ? { ...x, approval: approve ? "approved" : "declined", decidedAt: now() } : x)) }));
  // The seller's decision is relayed to the buyer as a seller-authored message.
  const text = approve
    ? note || (d.kind === "inspection" ? "The seller confirmed — let's arrange a time to see the item." : "The seller accepted. Let's arrange the details.")
    : note || "Thanks for your interest — the seller decided not to go ahead with this one.";
  await sendSellerMessage(d.conversationId, text);
}

export async function completeDeal(dealId: string, finalPrice: number | null) {
  const d = getState().deals.find((x) => x.id === dealId);
  if (!d) return;
  set((s) => ({
    deals: s.deals.map((x) => (x.id === dealId ? { ...x, approval: "completed", offeredPrice: finalPrice ?? x.offeredPrice, decidedAt: now() } : x)),
  }));
  patchProduct(d.productId, () => ({ status: "sold" }));
  for (const l of getState().listings.filter((x) => x.productId === d.productId && x.status !== "draft")) {
    await setListingAvailability(l.id, false, l.marketplace === d.marketplace);
    if (!getState().listings.find((x) => x.id === l.id)?.note?.startsWith("Couldn't")) patchListing(l.id, { status: "sold" });
  }
}

/* ================================================================== */
/* Notifications                                                      */
/* ================================================================== */

export function markNotificationRead(id: string) {
  set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
}
export function markAllRead() {
  set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
}

/* ================================================================== */
/* OLX sync (real conversations)                                      */
/* ================================================================== */

export async function syncMarketplaceThreads(id: MarketplaceId) {
  const adapter = ADAPTERS[id];
  if (!adapter.capabilities.threads || id === "mock") return 0;
  const threads = await adapter.listThreads();
  let fresh = 0;
  for (const t of threads) {
    const listing = getState().listings.find((l) => l.marketplace === id && l.externalId === t.advertId);
    if (!listing) continue; // only threads about listings UNLOAD published
    let c = getState().conversations.find((x) => x.marketplace === id && x.externalThreadId === t.id);
    if (!c) {
      c = {
        id: uid("c"),
        productId: listing.productId,
        marketplace: id,
        externalThreadId: t.id,
        buyerRef: t.buyerRef,
        demo: false,
        messages: [],
        lowOfferCount: 0,
        updatedAt: t.updatedAt,
        unread: true,
      };
      const created = c;
      set((s) => ({ conversations: [created, ...s.conversations] }));
    }
    const known = new Set(c.messages.map((m) => m.externalId).filter(Boolean));
    const msgs = (await adapter.listMessages(t.id)).sort((a, b) => a.createdAt - b.createdAt);
    for (const m of msgs) {
      if (known.has(m.id)) continue;
      if (m.fromBuyer) {
        fresh++;
        await receiveBuyerMessage(c.id, m.text, m.id);
      } else {
        patchConvo(c.id, (cc) => ({
          messages: [...cc.messages, { id: uid("m"), role: "seller", text: m.text, status: "sent", createdAt: m.createdAt, externalId: m.id }],
        }));
      }
    }
  }
  return fresh;
}

/* ================================================================== */
/* Demo buyers (clearly labeled, Demo Market only)                    */
/* ================================================================== */

const BUYERS = ["Alex", "Sam", "Jordan", "Taylor", "Riley", "Casey"];

export function demoScript(p: Product): string[] {
  const unknown = p.sellerQuestions.find((q) => !q.answer && !p.facts.some((f) => f.topic === q.topic));
  const desired = p.pricing.desired;
  const low = desired ? Math.round((desired * 0.8) / 5) * 5 : null;
  return [
    "Hi! Is this still available?",
    p.title.toLowerCase().includes("monitor") ? "Does the HDMI port actually work?" : unknown ? unknown.question : "Any scratches or other wear?",
    low ? `Would you accept ${p.pricing.currency === "KZT" ? `${low} тг` : `$${low}`}?` : "What's your best price?",
    "OK, sounds fair. Can I come see it tomorrow evening?",
  ];
}

export function startDemoConversation(productId: string) {
  const p = product(productId);
  if (!p) return null;
  const used = getState().conversations.filter((c) => c.demo).length;
  const c: Conversation = {
    id: uid("c"),
    productId,
    marketplace: "mock",
    buyerRef: `Demo buyer · ${BUYERS[used % BUYERS.length]}`,
    demo: true,
    messages: [],
    lowOfferCount: 0,
    updatedAt: now(),
    unread: true,
  };
  set((s) => ({ conversations: [c, ...s.conversations] }));
  return c.id;
}

/** Conversation for a marketplace without a messaging API: seller pastes buyer messages, copies replies back. */
export function createManualConversation(productId: string, marketplace: MarketplaceId, buyerRef: string) {
  const c: Conversation = {
    id: uid("c"),
    productId,
    marketplace,
    buyerRef: buyerRef || "Buyer",
    demo: false,
    messages: [],
    lowOfferCount: 0,
    updatedAt: now(),
    unread: false,
  };
  set((s) => ({ conversations: [c, ...s.conversations] }));
  return c.id;
}

/** Next scripted buyer line for a demo conversation, or null when the script is done. */
export function nextDemoLine(cid: string) {
  const c = convo(cid);
  const p = c && product(c.productId);
  if (!c || !p || !c.demo) return null;
  const sent = c.messages.filter((m) => m.role === "buyer").length;
  return demoScript(p)[sent] ?? null;
}

/* ================================================================== */
/* Workspace                                                          */
/* ================================================================== */

/** One sample product, published to the simulated Demo Market, with a scripted buyer. */
export async function loadDemoProduct(sampleId = "monitor") {
  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];
  const d = sample.draft();
  const answered = d.sellerQuestions.map((q) =>
    q.topic === "charger" ? { ...q, answer: "Yes, the original power cable is included." } : q.topic === "dead pixels" ? { ...q, answer: "No dead pixels and no scratches on the screen." } : q,
  );
  const id = createProduct({
    ...d,
    sellerQuestions: answered,
    status: "draft",
    demo: true,
    photos: sample.photos,
    facts: [],
    evidence: [],
    pricing: { currency: "USD", desired: 150, minimum: 130, negotiationEnabled: true, maxDiscountPct: 15 },
    pendingListingUpdates: [],
    analysis: { source: "demo", at: now() },
    agentEnabled: true,
  });
  for (const q of answered)
    if (q.answer) addFact(id, makeFact({ topic: q.topic, question: q.question, answer: q.answer, source: "seller", inListing: true }));
  await mockAdapter.connect();
  prepareListings(id, ["mock"]);
  const l = getState().listings.find((x) => x.productId === id && x.marketplace === "mock");
  if (l) await publishListing(l.id);
  return id;
}

export function resetWorkspace() {
  try {
    localStorage.removeItem("unload:mock-market");
  } catch {}
  set((s) => ({ ...EMPTY, settings: s.settings, ai: s.ai, integrations: s.integrations }));
}

export type { AutopilotSettings };
