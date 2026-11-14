import type { Listing, ListingStatus, MarketplaceId, Product } from "../core/types";
import { listingDescription, listingTitle } from "../listing/drafts";
import { uid } from "../util";
import {
  NotSupportedError,
  type Capabilities,
  type ExternalMessage,
  type ExternalThread,
  type IntegrationStatus,
  type MarketplaceAdapter,
} from "./types";

/* ------------------------------------------------------------------ */
/* Mock Marketplace — same interface as real providers, for development */
/* ------------------------------------------------------------------ */

const MOCK_KEY = "unload:mock-market";
type MockState = { connected: boolean; adverts: Record<string, { status: ListingStatus; views: number; createdAt: number }> };

function mockState(): MockState {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) ?? "") as MockState;
  } catch {
    return { connected: true, adverts: {} };
  }
}
function saveMock(s: MockState) {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(s));
  } catch {}
}

const ALL: Capabilities = { publish: true, update: true, readStatus: true, availability: true, threads: true, sendMessage: true };
const NONE: Capabilities = { publish: false, update: false, readStatus: false, availability: false, threads: false, sendMessage: false };

export const mockAdapter: MarketplaceAdapter = {
  id: "mock",
  name: "Demo Market",
  market: "Simulated marketplace for testing",
  defaultCurrency: "USD",
  titleMax: 80,
  capabilities: ALL,
  async status() {
    return mockState().connected
      ? { state: "connected", detail: "Simulated marketplace. Listings and buyers here are not real.", account: "demo-seller" }
      : { state: "requires_authorization", detail: "Connect the simulated account to publish demo listings." };
  },
  async connect() {
    saveMock({ ...mockState(), connected: true });
  },
  async disconnect() {
    saveMock({ ...mockState(), connected: false });
  },
  async publish() {
    const s = mockState();
    if (!s.connected) throw new Error("Demo Market isn't connected.");
    const id = uid("mk");
    s.adverts[id] = { status: "active", views: 0, createdAt: Date.now() };
    saveMock(s);
    return { externalId: id, status: "active", url: undefined, note: "Published to the simulated marketplace." };
  },
  async readStatus(l) {
    const s = mockState();
    const a = l.externalId ? s.adverts[l.externalId] : undefined;
    if (!a) return {};
    // Simulated traffic: views grow slowly with listing age.
    a.views = Math.floor((Date.now() - a.createdAt) / 90_000);
    saveMock(s);
    return { status: a.status, views: a.views };
  },
  async update() {},
  async setAvailability(l, active) {
    const s = mockState();
    const status: ListingStatus = active ? "active" : "inactive";
    if (l.externalId && s.adverts[l.externalId]) s.adverts[l.externalId].status = status;
    saveMock(s);
    return status;
  },
  async listThreads() {
    return [];
  },
  async listMessages() {
    return [];
  },
  async sendMessage() {
    return { id: uid("mm") };
  },
};

/* ------------------------------------------------------------------ */
/* OLX Kazakhstan — official Partner API via our server routes         */
/* ------------------------------------------------------------------ */

async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}

const OLX_STATUS: Record<string, ListingStatus> = {
  active: "active",
  new: "moderation",
  moderated: "moderation",
  limited: "moderation",
  unpaid: "moderation",
  removed_by_user: "inactive",
  outdated: "inactive",
  unconfirmed: "moderation",
  blocked: "error",
  disabled: "inactive",
};

/** Settings the OLX adapter needs from the app (city, contact name). */
export const olxContext = { city: "Алматы", contactName: "", phone: "" };

export const olxAdapter: MarketplaceAdapter = {
  id: "olx",
  name: "OLX Kazakhstan",
  market: "olx.kz · KZT",
  defaultCurrency: "KZT",
  titleMax: 70,
  capabilities: ALL,
  docs: "https://developer.olx.kz/api/doc",
  async status(): Promise<IntegrationStatus> {
    const s = await api<{ configured: boolean; connected: boolean; account: string | null }>("/api/olx/status");
    if (!s.configured)
      return {
        state: "unavailable",
        detail: "OLX Partner API access hasn't been approved for this deployment yet (OLX_CLIENT_ID / OLX_CLIENT_SECRET not set). Use manual export meanwhile.",
      };
    return s.connected
      ? { state: "connected", detail: "Connected through the official OLX OAuth + Partner API.", account: s.account ?? undefined }
      : { state: "requires_authorization", detail: "Sign in with OLX to let UNLOAD publish and read messages for you." };
  },
  async connect() {
    // full-page navigation: the OAuth flow leaves the app for olx.kz
    window.location.assign(new URL("/api/olx/connect", window.location.origin).toString());
  },
  async disconnect() {
    await api("/api/olx/disconnect", { method: "POST" });
  },
  async publish(listing: Listing, product: Product) {
    if (listing.currency !== "KZT") throw new Error("OLX Kazakhstan listings must be priced in KZT. Change the currency in pricing rules.");
    const imageUrls = product.photos
      .map((p) => (p.src.startsWith("/") ? `${window.location.origin}${p.src}` : p.src))
      .filter((u) => /^https?:\/\//.test(u));
    const a = await api<{ id: number; status: string; url?: string }>("/api/olx/adverts", {
      method: "POST",
      json: {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        negotiable: product.pricing.negotiationEnabled,
        categoryQuery: product.title,
        city: olxContext.city,
        contactName: olxContext.contactName,
        phone: olxContext.phone || undefined,
        imageUrls,
        externalId: listing.id,
      },
    });
    return {
      externalId: String(a.id),
      url: a.url,
      status: OLX_STATUS[a.status] ?? "moderation",
      note:
        imageUrls.length < product.photos.length
          ? "Photos taken in this browser aren't hosted publicly yet, so add them in your OLX account."
          : a.status === "limited" || a.status === "unpaid"
            ? "OLX's free limit for this category is used up — the ad waits for payment in your OLX account."
            : undefined,
    };
  },
  async readStatus(l) {
    if (!l.externalId) return {};
    const a = await api<{ status: string; url?: string }>(`/api/olx/adverts/${l.externalId}`);
    return { status: OLX_STATUS[a.status] ?? l.status, url: a.url ?? l.url };
  },
  async update(l) {
    if (!l.externalId) return;
    await api(`/api/olx/adverts/${l.externalId}`, { method: "PUT", json: { title: l.title, description: l.description, price: l.price } });
  },
  async setAvailability(l, active) {
    if (!l.externalId) return l.status;
    await api(`/api/olx/adverts/${l.externalId}/commands`, {
      method: "POST",
      json: active ? { command: "activate" } : { command: "deactivate", isSuccess: true },
    });
    return active ? "active" : "sold";
  },
  async listThreads(): Promise<ExternalThread[]> {
    const t = await api<{ id: number; advert_id: number; interlocutor_id: number; unread_count: number; last_message_created_at?: string }[]>(
      "/api/olx/threads",
    );
    return t.map((x) => ({
      id: String(x.id),
      advertId: String(x.advert_id),
      buyerRef: `OLX user ${x.interlocutor_id}`,
      unread: x.unread_count ?? 0,
      updatedAt: x.last_message_created_at ? Date.parse(x.last_message_created_at) : Date.now(),
    }));
  },
  async listMessages(threadId): Promise<ExternalMessage[]> {
    const m = await api<{ id: number; type: string; text: string; created_at: string }[]>(`/api/olx/threads/${threadId}/messages`);
    return m.map((x) => ({ id: String(x.id), fromBuyer: x.type === "received", text: x.text, createdAt: Date.parse(x.created_at) }));
  },
  async sendMessage(threadId, text) {
    const r = await api<{ id?: number }>(`/api/olx/threads/${threadId}/messages`, { method: "POST", json: { text } });
    return { id: r.id ? String(r.id) : undefined };
  },
};

/* ------------------------------------------------------------------ */
/* Manual-export providers — no supported publishing API in this build */
/* ------------------------------------------------------------------ */

function manual(id: MarketplaceId, name: string, market: string, titleMax: number, detail: string, docs: string): MarketplaceAdapter {
  const unsupported = (what: string) => async () => {
    throw new NotSupportedError(what, name);
  };
  return {
    id,
    name,
    market,
    defaultCurrency: "USD",
    titleMax,
    capabilities: NONE,
    docs,
    async status() {
      return { state: "manual_export", detail };
    },
    connect: unsupported("Account connection"),
    disconnect: async () => {},
    async publish() {
      return { status: "exported", note: `Copy the draft and post it on ${name} yourself, then mark it as posted.` };
    },
    readStatus: async () => ({}),
    update: async () => {},
    async setAvailability(_l, active) {
      return active ? "exported" : "sold";
    },
    listThreads: async () => [],
    listMessages: async () => [],
    sendMessage: unsupported("Messaging"),
  };
}

/* ------------------------------------------------------------------ */
/* eBay — official Sell APIs via our server routes; manual until keys  */
/* ------------------------------------------------------------------ */

const ebayManual = manual(
  "ebay",
  "eBay",
  "ebay.com · USD",
  80,
  "eBay API keys aren't configured on this deployment yet, so you export the draft and post it yourself.",
  "https://developer.ebay.com/api-docs/sell/inventory/overview.html",
);
let ebayApi = false;
let ebaySandbox = true;
const EBAY_CAPS: Capabilities = { publish: true, update: true, readStatus: true, availability: true, threads: false, sendMessage: false };

/** Seller location eBay needs for a merchant location (from Autopilot settings). */
export const ebayContext = { city: "", stateOrProvince: "", postalCode: "", country: "US" };

export const ebayAdapter: MarketplaceAdapter = {
  ...ebayManual,
  get capabilities() {
    return ebayApi ? EBAY_CAPS : NONE;
  },
  async status(): Promise<IntegrationStatus> {
    const s = await api<{ configured: boolean; connected: boolean; env: string }>("/api/ebay/status");
    ebayApi = s.configured;
    ebaySandbox = s.env === "sandbox";
    if (!s.configured) return ebayManual.status();
    const env = s.env === "sandbox" ? " (Sandbox — test listings only)" : "";
    return s.connected
      ? { state: "connected", detail: `Connected through eBay's official OAuth + Sell APIs${env}. Buyer messages stay on eBay.` }
      : { state: "requires_authorization", detail: `Sign in with eBay to let UNLOAD publish for you${env}.` };
  },
  async connect() {
    window.location.assign(new URL("/api/ebay/connect", window.location.origin).toString());
  },
  async disconnect() {
    if (ebayApi) await api("/api/ebay/disconnect", { method: "POST" });
  },
  async publish(listing: Listing, product: Product) {
    if (!ebayApi) return ebayManual.publish(listing, product);
    if (listing.currency !== "USD") throw new Error("eBay US listings must be priced in USD.");
    if (listing.price == null) throw new Error("Set an asking price first.");
    if (!ebayContext.postalCode) throw new Error("Add your US ZIP code in Autopilot settings (eBay needs an item location).");
    const imageUrls = product.photos
      .map((p) => (p.src.startsWith("/") ? `${window.location.origin}${p.src}` : p.src))
      .filter((u) => /^https:\/\//.test(u));
    const aspects = Object.fromEntries(product.attributes.filter((a) => a.name && a.value).map((a) => [a.name, [a.value]]));
    const r = await api<{ offerId: string; listingId: string }>("/api/ebay/offers", {
      method: "POST",
      json: {
        sku: listing.id,
        title: listing.title,
        description: listing.description,
        condition: product.condition,
        brand: product.brand || undefined,
        aspects,
        imageUrls,
        price: listing.price,
        categoryQuery: product.title,
        location: ebayContext,
      },
    });
    return {
      externalId: r.offerId,
      url: `https://www.${ebaySandbox ? "sandbox." : ""}ebay.com/itm/${r.listingId}`,
      status: "active" as const,
      note: imageUrls.length < product.photos.length ? "Photos taken in this browser aren't hosted publicly, so only hosted photos were sent." : undefined,
    };
  },
  async readStatus(l) {
    if (!ebayApi || !l.externalId) return {};
    const o = await api<{ status: string; listingStatus?: string }>(`/api/ebay/offers/${l.externalId}`);
    const st: ListingStatus = o.status === "PUBLISHED" ? (o.listingStatus === "ENDED" ? "inactive" : "active") : "inactive";
    return { status: st };
  },
  async update(l) {
    if (!ebayApi || !l.externalId) return;
    await api(`/api/ebay/offers/${l.externalId}`, { method: "PUT", json: { description: l.description, price: l.price } });
  },
  async setAvailability(l, active) {
    if (!ebayApi || !l.externalId) return ebayManual.setAvailability(l, active);
    if (active) throw new Error("A withdrawn eBay offer can't be reactivated from here — publish it again.");
    await api(`/api/ebay/offers/${l.externalId}/withdraw`, { method: "POST" });
    return "sold";
  },
};
export const facebookAdapter = manual(
  "facebook",
  "Facebook Marketplace",
  "facebook.com/marketplace · USD",
  100,
  "Meta doesn't offer a public API for individuals to post Marketplace listings. Export the draft and post it yourself.",
  "https://www.facebook.com/marketplace",
);
export const mercariAdapter = manual(
  "mercari",
  "Mercari",
  "mercari.com · USD",
  80,
  "Mercari doesn't offer a public listing API for individual sellers. Export the draft and post it yourself.",
  "https://www.mercari.com",
);

export const ADAPTERS: Record<MarketplaceId, MarketplaceAdapter> = {
  mock: mockAdapter,
  olx: olxAdapter,
  ebay: ebayAdapter,
  facebook: facebookAdapter,
  mercari: mercariAdapter,
};
export const MARKETPLACE_ORDER: MarketplaceId[] = ["olx", "ebay", "facebook", "mercari", "mock"];

export function draftListing(product: Product, m: MarketplaceId): Listing {
  return {
    id: uid("l"),
    productId: product.id,
    marketplace: m,
    status: "draft",
    title: listingTitle(product, m),
    description: listingDescription(product, m),
    price: product.pricing.desired,
    currency: product.pricing.currency,
  };
}
