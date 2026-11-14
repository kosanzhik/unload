import type { Conversation, Goal, Listing, Offer, Product } from "../core/types";
import { counterFor, money, priceStep } from "../negotiation/policy";

/**
 * AutoSale Strategy Engine — deterministic.
 * The goal sets negotiation style and when to suggest changes. Every tip is
 * built from this account's real data (listing age, reported views, real
 * conversations and offers). Nothing here predicts demand or guarantees a sale.
 */

export type GoalProfile = {
  id: Goal;
  label: string;
  tagline: string;
  bullets: string[];
  /** default private minimum as a share of the asking price (seller can change it) */
  minimumShare: number;
  /** days without any inquiry before suggesting a price change */
  quietDays: number;
  /** suggested price drop when quiet, as a share of the asking price */
  dropShare: number;
};

export const GOALS: Record<Goal, GoalProfile> = {
  fast: {
    id: "fast",
    label: "Sell Fast",
    tagline: "Clear it out quickly.",
    bullets: ["Competitive counteroffers", "Suggests price changes after 2 quiet days", "Acts on any offer in your range"],
    minimumShare: 0.8,
    quietDays: 2,
    dropShare: 0.08,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    tagline: "A fair price without the wait.",
    bullets: ["Meets buyers halfway", "Gradual changes after 4 quiet days", "Filters out lowball offers"],
    minimumShare: 0.87,
    quietDays: 4,
    dropShare: 0.05,
  },
  max: {
    id: "max",
    label: "Get More Money",
    tagline: "Hold out for the best offer.",
    bullets: ["Small, careful concessions", "Waits 7 days before any change", "Compares offers before you decide"],
    minimumShare: 0.93,
    quietDays: 7,
    dropShare: 0.03,
  },
};

export const GOAL_ORDER: Goal[] = ["fast", "balanced", "max"];

/** Suggested private minimum for a goal — a starting point the seller approves or edits. */
export function suggestedMinimum(desired: number, goal: Goal) {
  return Math.round((desired * GOALS[goal].minimumShare) / priceStep(desired)) * priceStep(desired);
}

export type Tip = {
  id: string;
  kind: "measured" | "heuristic";
  tone: "good" | "info" | "warn";
  title: string;
  body: string;
  action?: { type: "set_price"; price: number; label: string } | { type: "open"; href: string; label: string };
};

const DAY = 86_400_000;

export function strategyTips(
  p: Product,
  listings: Listing[],
  conversations: Conversation[],
  offers: Offer[],
  now = Date.now(),
): Tip[] {
  if (p.status === "sold" || p.status === "archived") return [];
  const g = GOALS[p.goal];
  const fmt = (n: number | null) => money(n, p.pricing.currency);
  const mine = listings.filter((l) => l.productId === p.id);
  const live = mine.filter((l) => ["active", "moderation", "exported"].includes(l.status) && l.publishedAt);
  const chats = conversations.filter((c) => c.productId === p.id && c.messages.some((m) => m.role === "buyer"));
  const myOffers = offers.filter((o) => o.productId === p.id);
  const pending = myOffers.filter((o) => o.status === "pending");
  const tips: Tip[] = [];

  // 1. Real offers in range — always first.
  const best = [...pending].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
  if (best)
    tips.push({
      id: `offer-${best.id}`,
      kind: "measured",
      tone: "good",
      title: `A buyer offered ${fmt(best.price)}`,
      body:
        p.goal === "max" && pending.length > 1
          ? `You have ${pending.length} offers. The highest is ${fmt(best.price)} — compare them before accepting.`
          : `${fmt(best.price)} is within your approved range.${best.when ? ` They proposed: ${best.when}.` : ""}`,
      action: { type: "open", href: `/inbox?tab=offers`, label: "Review offer" },
    });

  if (!live.length) {
    tips.push({
      id: "publish",
      kind: "heuristic",
      tone: "info",
      title: "Not listed anywhere yet",
      body: "Publish to at least one marketplace so buyers can find it.",
      action: { type: "open", href: `/items/${p.id}#listings`, label: "Publish" },
    });
    return tips;
  }

  // 2. Quiet listing → price suggestion based on the goal (never below the minimum).
  const firstLive = Math.min(...live.map((l) => l.publishedAt!));
  const days = Math.floor((now - firstLive) / DAY);
  const views = mine.reduce((s, l) => s + (l.views ?? 0), 0);
  const hasViews = mine.some((l) => l.views != null);
  if (chats.length === 0 && days >= g.quietDays && p.pricing.desired != null) {
    const floor = p.pricing.minimum ?? 0;
    const step = priceStep(p.pricing.desired);
    const next = Math.max(floor, Math.round((p.pricing.desired * (1 - g.dropShare)) / step) * step);
    if (!p.dismissedTips.includes(`drop-${p.pricing.desired}`))
      tips.push({
        id: `drop-${p.pricing.desired}`,
        kind: "measured",
        tone: "warn",
        title: `No inquiries in ${days} day${days === 1 ? "" : "s"}`,
        body:
          next < p.pricing.desired
            ? `Your ${short(p)} hasn't received any inquiries${hasViews ? ` (${views} views reported)` : ""}. ${g.label} suggests trying ${fmt(next)}. No guarantee it sells faster.`
            : `Your asking price is already at your minimum. Consider clearer photos or adding the model name to the title.`,
        action: next < p.pricing.desired ? { type: "set_price", price: next, label: `Change to ${fmt(next)}` } : undefined,
      });
  }

  // 3. Repeated low offers.
  const low = chats.reduce((s, c) => s + c.lowOfferCount, 0);
  if (low >= 2)
    tips.push({
      id: "low-offers",
      kind: "measured",
      tone: "info",
      title: `${low} offers came in below your range`,
      body:
        p.goal === "fast"
          ? `If speed matters most, you could lower your minimum (now ${fmt(p.pricing.minimum)}). Your call.`
          : "The agent is holding your range. Keep it if you can wait.",
    });

  // 4. Activity summary (measured, only real numbers).
  tips.push({
    id: "activity",
    kind: "measured",
    tone: "info",
    title: "So far",
    body: `Listed ${days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`} · ${chats.length} conversation${chats.length === 1 ? "" : "s"} · ${myOffers.length} offer${myOffers.length === 1 ? "" : "s"}${hasViews ? ` · ${views} views` : ""}. Agent counters at ${fmt(counterFor(p.pricing, p.goal))} for ${g.label}.`,
  });

  if (!p.brand || !p.model)
    tips.push({
      id: "model",
      kind: "heuristic",
      tone: "info",
      title: "Add the brand and model",
      body: "Buyers search by model name, and the AI can't answer spec questions without it.",
      action: { type: "open", href: `/items/${p.id}#details`, label: "Edit details" },
    });

  return tips;
}

export function short(p: Pick<Product, "title">) {
  return p.title.split(/ [—–-] |,/)[0].replace(/^\d+-inch\s+/i, "").toLowerCase();
}
