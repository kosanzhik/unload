/**
 * UNLOAD Autopilot domain model.
 * Everything the UI, the agent and the marketplace adapters share lives here.
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

/* ---------- Product knowledge base (Living Listing) ---------- */

export type FactSource =
  | "seller" // seller typed or confirmed it
  | "evidence" // seller confirmed it and attached a photo/video
  | "photo"; // visible in a listing photo, confirmed by the seller during review

export type Fact = {
  id: string;
  /** short topic key used for matching buyer questions, e.g. "hdmi", "stand", "dead pixels" */
  topic: string;
  /** the question this fact answers, in plain words */
  question: string;
  answer: string;
  source: FactSource;
  evidenceIds: string[];
  createdAt: number;
  /** true when the seller allowed adding it to the public listing text */
  inListing: boolean;
};

export type Evidence = {
  id: string;
  kind: "photo" | "video" | "note";
  fileName?: string;
  mime?: string;
  size?: number;
  /** IndexedDB key for the binary; absent for notes */
  blobKey?: string;
  note?: string;
  createdAt: number;
};

/* ---------- Pricing & automation ---------- */

export type PricingRules = {
  currency: Currency;
  /** public asking price */
  desired: number | null;
  /** private floor — never shown to buyers */
  minimum: number | null;
  /** the agent may make counteroffers between desired and minimum */
  negotiationEnabled: boolean;
  /** extra cap on discounts, % off desired (0–100) */
  maxDiscountPct: number;
};

export type AutomationMode = "manual" | "assisted" | "autopilot";

export type ReplyCategory = "availability" | "condition" | "logistics" | "pricing";

export type AutopilotSettings = {
  mode: AutomationMode;
  /** which routine replies may be sent without approval (assisted / autopilot) */
  allowedReplies: Record<ReplyCategory, boolean>;
  /** logistics the seller actually offers — the agent never promises others */
  pickup: boolean;
  shipping: boolean;
  meetingArea: string;
  escalation: {
    paymentQuestions: boolean;
    offPlatformContact: boolean;
    repeatedLowOffers: boolean;
  };
  notifications: {
    browser: boolean;
    dealRequests: boolean;
    verificationTasks: boolean;
    approvals: boolean;
  };
};

/* ---------- Product ---------- */

export type ProductStatus = "draft" | "ready" | "listed" | "sold" | "archived";

export type SellerQuestion = {
  id: string;
  question: string;
  why: string;
  topic: string;
  answer?: string;
};

export type Product = {
  id: string;
  createdAt: number;
  status: ProductStatus;
  demo: boolean;
  photos: Photo[];
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  brand: string;
  model: string;
  attributes: { name: string; value: string }[];
  /** what the AI could not determine from photos */
  missing: string[];
  sellerQuestions: SellerQuestion[];
  facts: Fact[];
  evidence: Evidence[];
  pricing: PricingRules;
  /** listing-text changes proposed from new verified facts, awaiting approval */
  pendingListingUpdates: { id: string; factId: string; text: string }[];
  analysis: { source: "claude" | "demo" | "manual"; at: number } | null;
  /** seller enabled the AI sales agent for this product */
  agentEnabled: boolean;
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
  views?: number;
};

/* ---------- Conversations ---------- */

export type MessageRole = "buyer" | "agent" | "seller" | "system";

export type MessageStatus =
  | "received"
  | "pending_approval" // agent draft waiting for the seller
  | "sent"
  | "failed"
  | "discarded";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  status: MessageStatus;
  createdAt: number;
  /** why the agent wrote this, shown to the seller */
  rationale?: string;
  category?: ReplyCategory | "escalation" | "deal";
  externalId?: string;
};

export type Conversation = {
  id: string;
  productId: string;
  marketplace: MarketplaceId;
  externalThreadId?: string;
  buyerRef: string;
  /** demo conversations are scripted and clearly labeled in the UI */
  demo: boolean;
  messages: Message[];
  lowOfferCount: number;
  updatedAt: number;
  unread: boolean;
};

/* ---------- Verification & deals ---------- */

export type VerificationTask = {
  id: string;
  productId: string;
  conversationId?: string;
  /** the buyer's original words, answered again once verified */
  buyerQuestion?: string;
  topic: string;
  question: string;
  instruction: string;
  status: "open" | "done" | "dismissed";
  createdAt: number;
  factId?: string;
};

export type DealKind = "offer" | "inspection" | "purchase";

export type DealRequest = {
  id: string;
  productId: string;
  conversationId: string;
  marketplace: MarketplaceId;
  buyerRef: string;
  kind: DealKind;
  offeredPrice: number | null;
  currency: Currency;
  conditions: string;
  summary: string;
  verification: "verified" | "partially_verified" | "unverified";
  approval: "pending" | "approved" | "declined" | "completed";
  createdAt: number;
  decidedAt?: number;
};

/* ---------- Notifications ---------- */

export type Notification = {
  id: string;
  kind: "deal" | "verification" | "approval" | "listing" | "info";
  title: string;
  body: string;
  href: string;
  createdAt: number;
  read: boolean;
};
