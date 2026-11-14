"use client";

import { useSyncExternalStore } from "react";
import { decide, needsApproval, shortName, type AgentDecision } from "./agent/salesAgent";
import type {
  Activity,
  ActivityKind,
  Conversation,
  Fact,
  Goal,
  IntegrationState,
  Listing,
  MarketplaceId,
  Message,
  Notification,
  Offer,
  OpenQuestion,
  Product,
} from "./core/types";
import { knowledgeSheet } from "./knowledge/kb";
import { listingDescription, listingTitle } from "./listing/drafts";
import { ADAPTERS, connectReverbToken, draftListing, ebayContext, mockAdapter, olxContext } from "./marketplaces/registry";
import type { IntegrationStatus } from "./marketplaces/types";
import { guardReply, money, parseOffer } from "./negotiation/policy";
import { suggestedMinimum } from "./strategy/engine";
import { uid } from "./util";
import { SAMPLES } from "./vision/demo";

/* ================================================================== */
/* State                                                              */
/* ================================================================== */

export type Prefs = { olxCity: string; contactName: string; phone: string; usCity: string; usState: string; usZip: string; browserAlerts: boolean };

export type AppState = {
  products: Product[];
  listings: Listing[];
  conversations: Conversation[];
  questions: OpenQuestion[];
  offers: Offer[];
  activity: Activity[];
  notifications: Notification[];
  prefs: Prefs;
  integrations: Partial<Record<MarketplaceId, IntegrationStatus>>;
  ai: { claude: boolean; model: string | null; checked: boolean };
};

const DEFAULT_PREFS: Prefs = { olxCity: "Алматы", contactName: "", phone: "", usCity: "", usState: "", usZip: "", browserAlerts: false };

const EMPTY: AppState = {
  products: [],
  listings: [],
  conversations: [],
  questions: [],
  offers: [],
  activity: [],
  notifications: [],
  prefs: DEFAULT_PREFS,
  integrations: {},
  ai: { claude: false, model: null, checked: false },
};

const KEY = "unload:autopilot:v2";
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
      state = { ...EMPTY, ...s, prefs: { ...DEFAULT_PREFS, ...s.prefs }, integrations: {}, ai: EMPTY.ai };
    }
  } catch {}
  applyContexts();
}

function applyContexts() {
  const p = state.prefs;
  Object.assign(olxContext, { city: p.olxCity, contactName: p.contactName, phone: p.phone });
  Object.assign(ebayContext, { city: p.usCity, stateOrProvince: p.usState, postalCode: p.usZip, country: "US" });
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

/** Select a slice of state. Return existing references only (derive with useMemo). */
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

/** Truthful activity feed: only things that actually happened in this app. */
function log(kind: ActivityKind, productId: string, text: string, demo: boolean) {
  set((s) => ({ activity: [{ id: uid("a"), kind, productId, text, at: now(), demo }, ...s.activity].slice(0, 300) }));
}

function notify(n: Omit<Notification, "id" | "createdAt" | "read">) {
  set((s) => ({ notifications: [{ ...n, id: uid("n"), createdAt: now(), read: false }, ...s.notifications].slice(0, 100) }));
  if (getState().prefs.browserAlerts && typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(n.title, { body: n.body });
    } catch {}
  }
}

const isDemo = (x: { marketplace: MarketplaceId; demo?: boolean }) => x.marketplace === "mock" || Boolean(x.demo);

/* ================================================================== */
/* Prefs, AI & integrations                                           */
/* ================================================================== */

export function updatePrefs(patch: Partial<Prefs>) {
  set((s) => ({ prefs: { ...s.prefs, ...patch } }));
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
/* Items                                                              */
/* ================================================================== */

export type NewItem = Omit<Product, "id" | "createdAt" | "status" | "dismissedTips" | "facts"> & { facts?: Fact[] };

export function createItem(p: NewItem) {
  const id = uid("p");
  set((s) => ({ products: [{ ...p, facts: p.facts ?? [], id, createdAt: now(), status: "draft", dismissedTips: [] }, ...s.products] }));
  log("listing_prepared", id, `Listing prepared: ${p.title}`, p.demo);
  return id;
}

export function updateItem(id: string, patch: Partial<Product>) {
  patchProduct(id, () => patch);
}

export function deleteItem(id: string) {
  set((s) => ({
    products: s.products.filter((p) => p.id !== id),
    listings: s.listings.filter((l) => l.productId !== id),
    conversations: s.conversations.filter((c) => c.productId !== id),
    questions: s.questions.filter((q) => q.productId !== id),
    offers: s.offers.filter((o) => o.productId !== id),
    activity: s.activity.filter((a) => a.productId !== id),
  }));
}

export function makeFact(topic: string, question: string, answer: string, inListing = false): Fact {
  return { id: uid("f"), topic, question, answer, source: "seller", createdAt: now(), inListing };
}

export function addFact(productId: string, fact: Fact) {
  patchProduct(productId, (p) => ({ facts: [...p.facts.filter((f) => f.topic !== fact.topic), fact] }));
}
export function removeFact(productId: string, factId: string) {
  patchProduct(productId, (p) => ({ facts: p.facts.filter((f) => f.id !== factId) }));
}

/** Change the asking price (from a strategy tip or the item page) and sync live listings. */
export async function setPrice(productId: string, desired: number, minimum?: number | null) {
  patchProduct(productId, (p) => ({
    pricing: { ...p.pricing, desired, minimum: minimum === undefined ? Math.min(p.pricing.minimum ?? desired, desired) : minimum },
  }));
  await syncListingText(productId);
}

export function dismissTip(productId: string, tipId: string) {
  patchProduct(productId, (p) => ({ dismissedTips: [...p.dismissedTips, tipId] }));
}

/** Rebuild listing text and push it to live listings where the marketplace supports updates. */
export async function syncListingText(productId: string) {
  const p = product(productId);
  if (!p) return;
  for (const l of getState().listings.filter((x) => x.productId === productId)) {
    const next = { title: listingTitle(p, l.marketplace), description: listingDescription(p, l.marketplace), price: p.pricing.desired };
    patchListing(l.id, next);
    const a = ADAPTERS[l.marketplace];
    if (l.externalId && a.capabilities.update && (l.status === "active" || l.status === "moderation")) {
      try {
        await a.update({ ...l, ...next }, p);
      } catch (e) {
        patchListing(l.id, { note: `Update failed: ${e instanceof Error ? e.message : "error"}` });
      }
    }
  }
}

/* ================================================================== */
/* Listings                                                           */
/* ================================================================== */

export function prepareListings(productId: string, markets: MarketplaceId[]) {
  const p = product(productId);
  if (!p) return [];
  const existing = new Set(getState().listings.filter((l) => l.productId === productId).map((l) => l.marketplace));
  const fresh = markets.filter((m) => !existing.has(m)).map((m) => draftListing(p, m));
  set((s) => ({ listings: [...s.listings, ...fresh] }));
  return getState().listings.filter((l) => l.productId === productId && markets.includes(l.marketplace));
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

const inFlight = new Set<string>();

/** Publish one listing. Idempotent: never publishes the same listing twice. */
export async function publishListing(id: string) {
  const l = getState().listings.find((x) => x.id === id);
  let p = l && product(l.productId);
  if (!l || !p) return;
  if (inFlight.has(id) || l.externalId || ["publishing", "active", "moderation", "exported", "sold"].includes(l.status)) return;
  inFlight.add(id);
  const a = ADAPTERS[l.marketplace];
  patchListing(id, { status: "publishing", note: undefined });
  log("publication_submitted", p.id, `Publication submitted to ${a.name}`, isDemo(l));
  try {
    if (a.capabilities.publish && l.marketplace !== "mock") p = (await hostPhotos(p.id)) ?? p;
    const r = await a.publish(l, p);
    patchListing(id, { ...r, publishedAt: now() });
    patchProduct(p.id, () => ({ status: "selling" }));
    log(
      "published",
      p.id,
      r.status === "exported" ? `Draft ready to post on ${a.name} (manual)` : `Live on ${a.name}${l.marketplace === "mock" ? " (demo marketplace)" : ""}`,
      isDemo(l),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publishing failed";
    patchListing(id, { status: "error", note: msg });
    log("publish_failed", p.id, `${a.name}: ${msg}`, isDemo(l));
  } finally {
    inFlight.delete(id);
  }
}

export function markPostedManually(id: string, url: string) {
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
    patchListing(id, { note: `Couldn't change availability: ${e instanceof Error ? e.message : "error"}` });
  }
}

/** Sell flow: approve → activate autopilot → publish to the chosen marketplaces. */
export async function activateAutopilot(productId: string, markets: MarketplaceId[]) {
  patchProduct(productId, () => ({ autopilot: true }));
  const ls = prepareListings(productId, markets);
  await Promise.all(ls.map((l) => publishListing(l.id)));
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
  if (!c || !m || m.status === "sent") return;
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

const handled = new Set<string>();

/** Agent handles one buyer message: facts → policy/strategy → reply → offers/questions/notifications. */
async function agentHandle(cid: string, buyerMsgId: string, buyerText: string, opts: { followUp?: boolean } = {}) {
  const key = `${cid}:${buyerMsgId}:${opts.followUp ? "f" : ""}`;
  if (handled.has(key)) return; // never answer the same message twice
  handled.add(key);
  const c = convo(cid);
  const p = c && product(c.productId);
  if (!c || !p) return;
  const demo = isDemo(c);
  const d = decide(p, c, buyerText);
  if (opts.followUp) {
    d.offer = undefined;
    d.question = undefined;
    d.reply = `Update on your question (“${buyerText.trim()}”): ${d.reply}`;
  }
  const { text, phrased } = await phrase(d, p, c, buyerText);
  const approval = needsApproval(p.autopilot);
  const mid = uid("m");

  patchConvo(cid, (cc) => ({
    lowOfferCount: cc.lowOfferCount + (d.lowOffer ? 1 : 0),
    lastCounter: d.counter ?? cc.lastCounter,
    messages: [
      ...cc.messages,
      {
        id: mid,
        role: "agent",
        text,
        status: approval ? "pending_approval" : "sent",
        createdAt: now(),
        rationale: `${d.rationale}${phrased ? " Worded by Claude, checked by the price guard." : ""}`,
      },
    ],
  }));
  if (!approval) await deliver(cid, mid);

  const name = shortName(p).toLowerCase();
  if (approval) {
    log("approval_requested", p.id, `Reply to ${c.buyerRef} is waiting for your approval`, demo);
    notify({ title: "Reply waiting for your OK", body: `${shortName(p)} · “${buyerText.slice(0, 70)}”`, href: `/inbox?c=${cid}` });
  } else if (d.counter != null) log("counteroffer_sent", p.id, `Countered ${c.buyerRef} at ${money(d.counter, p.pricing.currency)}`, demo);
  else if (d.intent === "question" && !d.question) log("question_answered", p.id, `Answered ${c.buyerRef}: “${buyerText.slice(0, 60)}”`, demo);

  if (d.question) {
    const exists = getState().questions.find((q) => q.productId === p.id && q.topic === d.question!.topic && q.status === "open");
    if (!exists) {
      set((s) => ({
        questions: [
          { id: uid("q"), productId: p.id, conversationId: cid, buyerQuestion: buyerText, status: "open", createdAt: now(), ...d.question! },
          ...s.questions,
        ],
      }));
      log("question_for_seller", p.id, `A buyer asked something only you know: “${buyerText.slice(0, 60)}”`, demo);
      notify({ title: "A buyer asked something only you know", body: d.question.question, href: "/inbox?tab=questions" });
    }
  }

  if (d.offer) {
    // One open offer per conversation: a newer one replaces the older pending one.
    const offer: Offer = {
      id: uid("o"),
      productId: p.id,
      conversationId: cid,
      marketplace: c.marketplace,
      buyerRef: c.buyerRef,
      kind: d.offer.kind,
      price: d.offer.price,
      currency: p.pricing.currency,
      when: d.offer.when,
      summary: summarize(c, buyerText),
      status: "pending",
      createdAt: now(),
    };
    set((s) => ({ offers: [offer, ...s.offers.filter((o) => !(o.conversationId === cid && o.status === "pending"))] }));
    log("offer_received", p.id, `${c.buyerRef} is ready: ${money(offer.price, offer.currency)}${offer.when ? ` · ${offer.when}` : ""}`, demo);
    notify({
      title:
        offer.kind === "meeting"
          ? `Someone wants to see your ${name}${offer.when ? ` ${offer.when}` : ""}`
          : `Good news! Someone wants to buy your ${name} for ${money(offer.price, offer.currency)}${offer.when ? ` and pick it up ${offer.when}` : ""}.`,
      body: `${c.buyerRef}${demo ? " (demo buyer)" : ""} · Accept, reject or counter.`,
      href: "/inbox?tab=offers",
      offerId: offer.id,
    });
  }

  if (d.escalate) notify({ title: d.escalate, body: `${shortName(p)} · “${buyerText.slice(0, 80)}”`, href: `/inbox?c=${cid}` });
}

function summarize(c: Conversation, latest: string) {
  const buyer = [...c.messages.filter((m) => m.role === "buyer").map((m) => m.text)];
  if (!buyer.includes(latest)) buyer.push(latest);
  const offers = buyer.map(parseOffer).filter((n): n is number => n != null);
  return [
    `${buyer.length} buyer message${buyer.length > 1 ? "s" : ""}.`,
    offers.length ? `Prices mentioned: ${offers.join(", ")}.` : "",
    c.lastCounter ? `Agent's last counteroffer: ${c.lastCounter}.` : "",
    `Latest: “${latest}”`,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function receiveBuyerMessage(cid: string, text: string, externalId?: string) {
  const c = convo(cid);
  if (!c) return;
  if (externalId && c.messages.some((m) => m.externalId === externalId)) return; // duplicate from a sync
  const mid = uid("m");
  patchConvo(cid, (cc) => ({ unread: true, messages: [...cc.messages, { id: mid, role: "buyer", text, status: "received", createdAt: now(), externalId }] }));
  await agentHandle(cid, mid, text);
}

export async function approveMessage(cid: string, mid: string, text: string) {
  patchMessage(cid, mid, { text, status: "pending_approval" });
  const c = convo(cid);
  if (c && (c.demo || !c.externalThreadId)) patchMessage(cid, mid, { status: "sent" });
  else await deliver(cid, mid);
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
/* Questions for the seller                                           */
/* ================================================================== */

export async function answerQuestion(qid: string, answer: string, inListing: boolean) {
  const q = getState().questions.find((x) => x.id === qid);
  if (!q || !answer.trim() || q.status !== "open") return;
  addFact(q.productId, makeFact(q.topic, q.question, answer.trim(), inListing));
  set((s) => ({ questions: s.questions.map((x) => (x.id === qid ? { ...x, status: "answered" } : x)) }));
  if (inListing) await syncListingText(q.productId);
  if (q.conversationId) await agentHandle(q.conversationId, q.id, q.buyerQuestion, { followUp: true });
}

export function dismissQuestion(qid: string) {
  set((s) => ({ questions: s.questions.map((q) => (q.id === qid ? { ...q, status: "dismissed" } : q)) }));
}

/* ================================================================== */
/* Buyer offers                                                       */
/* ================================================================== */

function decideOffer(id: string, status: Offer["status"]) {
  set((s) => ({ offers: s.offers.map((o) => (o.id === id ? { ...o, status, decidedAt: now() } : o)) }));
}

export async function acceptOffer(id: string, note = "") {
  const o = getState().offers.find((x) => x.id === id);
  const p = o && product(o.productId);
  if (!o || !p || o.status !== "pending") return;
  decideOffer(id, "accepted");
  const where = p.logistics.pickup ? `Pickup${p.logistics.area ? ` near ${p.logistics.area}` : ""}${o.when ? ` ${o.when}` : ""} works` : p.logistics.shipping ? "I'll ship it" : "";
  await sendSellerMessage(o.conversationId, note || `Deal — ${money(o.price, o.currency)} works.${where ? ` ${where}.` : ""} Please confirm a time that suits you.`);
  log("deal_accepted", p.id, `You accepted ${money(o.price, o.currency)} from ${o.buyerRef}`, isDemo(o));
}

export async function rejectOffer(id: string, note = "") {
  const o = getState().offers.find((x) => x.id === id);
  if (!o || o.status !== "pending") return;
  decideOffer(id, "rejected");
  await sendSellerMessage(o.conversationId, note || "Thanks for your interest — I'll pass on this offer.");
  log("deal_rejected", o.productId, `You declined ${o.buyerRef}'s offer`, isDemo(o));
}

export async function counterOffer(id: string, price: number) {
  const o = getState().offers.find((x) => x.id === id);
  if (!o || o.status !== "pending") return;
  decideOffer(id, "countered");
  patchConvo(o.conversationId, () => ({ lastCounter: price }));
  await sendSellerMessage(o.conversationId, `I can do ${money(price, o.currency)}. Let me know if that works.`);
  log("counteroffer_sent", o.productId, `You countered ${o.buyerRef} at ${money(price, o.currency)}`, isDemo(o));
}

/** Seller confirms the item changed hands → item sold, listings ended where supported. */
export async function markSold(offerId: string) {
  const o = getState().offers.find((x) => x.id === offerId);
  if (!o || o.status !== "accepted") return;
  decideOffer(offerId, "sold");
  patchProduct(o.productId, () => ({ status: "sold" }));
  for (const l of getState().listings.filter((x) => x.productId === o.productId && x.status !== "draft")) {
    await setListingAvailability(l.id, false, l.marketplace === o.marketplace);
    if (!getState().listings.find((x) => x.id === l.id)?.note?.startsWith("Couldn't")) patchListing(l.id, { status: "sold" });
  }
  log("sold", o.productId, `Sold for ${money(o.price, o.currency)}`, isDemo(o));
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
/* Sync with connected marketplaces (real conversations)              */
/* ================================================================== */

const syncing = new Set<MarketplaceId>();

export async function syncMarketplaceThreads(id: MarketplaceId) {
  const adapter = ADAPTERS[id];
  if (!adapter.capabilities.threads || id === "mock" || syncing.has(id)) return 0;
  syncing.add(id);
  let fresh = 0;
  try {
    for (const t of await adapter.listThreads()) {
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
          lastCounter: null,
          lowOfferCount: 0,
          updatedAt: t.updatedAt,
          unread: true,
        };
        const created = c;
        set((s) => ({ conversations: [created, ...s.conversations] }));
      }
      const known = new Set(c.messages.map((m) => m.externalId).filter(Boolean));
      for (const m of (await adapter.listMessages(t.id)).sort((a, b) => a.createdAt - b.createdAt)) {
        if (known.has(m.id)) continue;
        if (m.fromBuyer) {
          fresh++;
          await receiveBuyerMessage(c.id, m.text, m.id);
        } else
          patchConvo(c.id, (cc) => ({
            messages: [...cc.messages, { id: uid("m"), role: "seller", text: m.text, status: "sent", createdAt: m.createdAt, externalId: m.id }],
          }));
      }
    }
  } finally {
    syncing.delete(id);
  }
  return fresh;
}

/* ================================================================== */
/* Demo buyers (clearly labeled, demo marketplace only)               */
/* ================================================================== */

const BUYERS = ["Alex", "Sam", "Jordan", "Taylor", "Riley", "Casey"];

export function demoScript(p: Product): string[] {
  const desired = p.pricing.desired ?? 100;
  const low = Math.round((desired * 0.8) / 5) * 5;
  const cur = p.pricing.currency === "KZT" ? (n: number) => `${n} тг` : (n: number) => `$${n}`;
  return [
    "Hi! Is this still available?",
    p.title.toLowerCase().includes("monitor") ? "Does it come with the power cable?" : "Any scratches or other wear?",
    `Would you take ${cur(low)}?`,
    "OK, deal. Can I pick it up tomorrow evening?",
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
    lastCounter: null,
    lowOfferCount: 0,
    updatedAt: now(),
    unread: true,
  };
  set((s) => ({ conversations: [c, ...s.conversations] }));
  return c.id;
}

export function nextDemoLine(cid: string) {
  const c = convo(cid);
  const p = c && product(c.productId);
  if (!c || !p || !c.demo) return null;
  return demoScript(p)[c.messages.filter((m) => m.role === "buyer").length] ?? null;
}

/** For marketplaces without a messaging API: seller pastes buyer messages, copies replies back. */
export function createManualConversation(productId: string, marketplace: MarketplaceId, buyerRef: string) {
  const c: Conversation = {
    id: uid("c"),
    productId,
    marketplace,
    buyerRef: buyerRef || "Buyer",
    demo: false,
    messages: [],
    lastCounter: null,
    lowOfferCount: 0,
    updatedAt: now(),
    unread: false,
  };
  set((s) => ({ conversations: [c, ...s.conversations] }));
  return c.id;
}

/** One-click sample: monitor, $150 / min $130, live on the demo marketplace. */
export async function loadSampleItem(goal: Goal = "fast") {
  const s = SAMPLES[0];
  const d = s.draft();
  const answered = d.sellerQuestions.map((q) =>
    q.topic === "charger"
      ? { ...q, answer: "Yes, the original power cable is included." }
      : q.topic === "dead pixels"
        ? { ...q, answer: "No dead pixels and no scratches on the screen." }
        : q,
  );
  const id = createItem({
    ...d,
    sellerQuestions: answered,
    facts: answered.filter((q) => q.answer).map((q) => makeFact(q.topic, q.question, q.answer!, true)),
    demo: true,
    photos: s.photos,
    goal,
    pricing: { currency: "USD", desired: 150, minimum: Math.max(130, suggestedMinimum(150, goal)) },
    autopilot: true,
    logistics: { pickup: true, shipping: false, area: "" },
    analysis: { source: "demo", at: now() },
  });
  await mockAdapter.connect();
  await activateAutopilot(id, ["mock"]);
  return id;
}

export function resetWorkspace() {
  try {
    localStorage.removeItem("unload:mock-market");
  } catch {}
  handled.clear();
  set((s) => ({ ...EMPTY, prefs: s.prefs, ai: s.ai, integrations: s.integrations }));
}
