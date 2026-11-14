/**
 * UNLOAD Autopilot domain model.
 * Shared by the UI, the sales agent, the strategy engine and marketplace adapters.
 */

export type Currency = "USD" | "KZT";

export type Condition = "New" | "Like new" | "Good" | "Fair" | "For parts";
export const CONDITIONS: Condition[] = ["New", "Like new", "Good", "Fair", "For parts"];

export const CATEGORIES = [
  "Electronics",
  "Computers & accessories",
  "Audio",
  "Home & furniture",
  "Books",
  "Clothing & shoes",
  "Kitchen",
  "Sports & outdoors",
  "Kids & toys",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Photo = { id: string; src: string; name: string };

/** The seller's selling goal — drives the AutoSale strategy engine. */
export type Goal = "fast" | "balanced" | "max";

/* ---------- What the AI knows (seller-verified facts) ---------- */

export type Fact = {
  id: string;
  /** short topic key used for matching buyer questions, e.g. "hdmi", "charger" */
  topic: string;
  question: string;
  answer: string;
  source: "seller";
  createdAt: number;
  /** seller allowed it in the public listing text */
  inListing: boolean;
};

export type SellerQuestion = {
  id: string;
  question: string;
  why: string;
  topic: string;
  answer?: string;
};

/* ---------- Pricing ---------- */

export type PricingRules = {
  currency: Currency;
  /** public asking price */
  desired: number | null;
  /** private floor — never shown to buyers */
  minimum: number | null;
};

/* ---------- Product ---------- */

export type ProductStatus = "draft" | "selling" | "sold" | "archived";

export type Product = {
  id: string;
  createdAt: number;
  status: ProductStatus;
  /** created from a sample photo (demo) */
  demo: boolean;
  photos: Photo[];
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  brand: string;
  model: string;
  attributes: { name: string; value: string }[];
  missing: string[];
  sellerQuestions: SellerQuestion[];
  facts: Fact[];
  goal: Goal;
  pricing: PricingRules;
  /** Autopilot on: routine replies and in-range negotiation go out automatically */
  autopilot: boolean;
  /** pickup/shipping the seller offers — the agent never promises others */
  logistics: { pickup: boolean; shipping: boolean; area: string };
  analysis: { source: "claude" | "demo" | "manual"; at: number } | null;
  /** strategy suggestions the seller dismissed (by id) */
  dismissedTips: string[];
};

/* ---------- Marketplaces ---------- */

export type MarketplaceId = "mock" | "olx" | "ebay" | "reverb" | "facebook" | "mercari";

export type IntegrationState = "connected" | "requires_authorization" | "manual_export" | "unavailable";

export type ListingStatus = "draft" | "publishing" | "active" | "moderation" | "inactive" | "sold" | "exported" | "error";

export type Listing = {
  id: string;
  productId: string;
  marketplace: MarketplaceId;
  status: ListingStatus;
  externalId?: string;
  url?: string;
  title: string;
  description: string;
  price: number | null;
  currency: Currency;
  publishedAt?: number;
  note?: string;
  /** only when the marketplace actually reports it */
  views?: number;
};

/* ---------- Conversations ---------- */

export type MessageRole = "buyer" | "agent" | "seller" | "system";
export type MessageStatus = "received" | "pending_approval" | "sent" | "failed" | "discarded";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  status: MessageStatus;
  createdAt: number;
  rationale?: string;
  externalId?: string;
};

export type Conversation = {
  id: string;
  productId: string;
  marketplace: MarketplaceId;
  externalThreadId?: string;
  buyerRef: string;
  /** scripted demo buyer on the demo marketplace — labeled everywhere */
  demo: boolean;
  messages: Message[];
  /** last price the agent offered in this conversation */
  lastCounter: number | null;
  lowOfferCount: number;
  updatedAt: number;
  unread: boolean;
};

/* ---------- Questions for the seller ---------- */

export type OpenQuestion = {
  id: string;
  productId: string;
  conversationId?: string;
  buyerQuestion: string;
  topic: string;
  question: string;
  status: "open" | "answered" | "dismissed";
  createdAt: number;
};

/* ---------- Offers & deals ---------- */

export type OfferKind = "offer" | "purchase" | "meeting";

export type Offer = {
  id: string;
  productId: string;
  conversationId: string;
  marketplace: MarketplaceId;
  buyerRef: string;
  kind: OfferKind;
  price: number | null;
  currency: Currency;
  /** buyer's proposed timing / pickup, in their words */
  when: string;
  summary: string;
  status: "pending" | "accepted" | "rejected" | "countered" | "sold";
  createdAt: number;
  decidedAt?: number;
};

/* ---------- Activity & notifications ---------- */

export type ActivityKind =
  | "listing_prepared"
  | "publication_submitted"
  | "published"
  | "publish_failed"
  | "question_answered"
  | "reply_drafted"
  | "counteroffer_sent"
  | "offer_received"
  | "approval_requested"
  | "question_for_seller"
  | "deal_accepted"
  | "deal_rejected"
  | "sold";

export type Activity = {
  id: string;
  kind: ActivityKind;
  productId: string;
  text: string;
  at: number;
  /** happened on the demo marketplace / with a simulated buyer */
  demo: boolean;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: number;
  read: boolean;
  offerId?: string;
};
