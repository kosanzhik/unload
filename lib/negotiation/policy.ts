import type { Goal, PricingRules } from "../core/types";

/**
 * Negotiation Policy Engine — pure, deterministic.
 * Decides which prices the agent may mention. The private minimum never leaves
 * this module except as a bounded counteroffer that is >= the minimum.
 */

export type OfferDecision =
  | { action: "no_price"; reason: string }
  | { action: "accept_for_review"; offer: number; reason: string } // inside the approved range → seller confirms
  | { action: "counter"; offer: number; counter: number; reason: string };

/** How much of the gap between asking and minimum each goal concedes in one counteroffer. */
export const CONCESSION: Record<Goal, number> = { fast: 0.75, balanced: 0.5, max: 0.25 };

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export function priceStep(price: number) {
  if (price >= 100_000) return 5_000; // KZT-sized numbers
  if (price >= 10_000) return 1_000;
  if (price >= 1_000) return 50;
  if (price >= 100) return 5;
  return 1;
}

/** Counteroffer for a goal: asking − concession × (asking − minimum), never below the minimum. */
export function counterFor(rules: PricingRules, goal: Goal): number | null {
  const { desired, minimum } = rules;
  if (desired == null) return null;
  if (minimum == null || minimum >= desired) return desired;
  const raw = desired - (desired - minimum) * CONCESSION[goal];
  return Math.min(desired, Math.max(minimum, roundTo(raw, priceStep(desired))));
}

/**
 * Evaluate a buyer's offer.
 * - offer ≥ what we'd counter with → good offer, seller confirms
 * - offer < counter → counter (once at the goal's level; never below minimum)
 * - previous counter given → hold at the previous counter (no further concession)
 */
export function evaluateOffer(offer: number, rules: PricingRules, goal: Goal, lastCounter: number | null = null): OfferDecision {
  if (rules.desired == null) return { action: "no_price", reason: "No asking price set yet." };
  const counter = lastCounter ?? counterFor(rules, goal)!;
  if (offer >= counter || offer >= rules.desired)
    return { action: "accept_for_review", offer, reason: `Offer is inside the approved range (≥ ${counter}). Only the seller can accept.` };
  return {
    action: "counter",
    offer,
    counter,
    reason: lastCounter
      ? `Below the approved range; the agent holds its previous counteroffer (${counter}) instead of dropping further.`
      : `Below the approved range; ${goalLabel(goal)} strategy counters at ${counter}.`,
  };
}

export function goalLabel(g: Goal) {
  return { fast: "Sell Fast", balanced: "Balanced", max: "Get More Money" }[g];
}

/** Extracts a money amount from a buyer message ("$120", "120k", "120 000 тг"). */
export function parseOffer(text: string): number | null {
  const t = text.replace(/ /g, " ");
  const m =
    t.match(/(?:\$|₸)\s*(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)\s*(k|к)?/i) ??
    t.match(/(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)\s*(k|к|тыс)?\s*(?:\$|usd|dollars?|bucks|₸|тг|тенге|kzt)/i) ??
    t.match(/(?:offer|accept|take|do|pay|for|how about|at)\s*\$?\s*(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)\s*(k)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/[ ,]/g, ""));
  if (m[2]) n *= 1000;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Last line of defense for every outgoing text (template or AI-written):
 * only amounts the policy allows may appear.
 */
export function guardReply(text: string, rules: PricingRules, allowed: number[]): { ok: boolean; reason?: string } {
  const nums = [...text.matchAll(/(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/[ ,]/g, "")));
  const ok = new Set([...allowed, ...(rules.desired != null ? [rules.desired] : [])]);
  if (rules.minimum != null && !ok.has(rules.minimum) && nums.includes(rules.minimum))
    return { ok: false, reason: "Reply would reveal the private minimum price." };
  if (rules.desired != null && nums.some((n) => !ok.has(n) && n < rules.desired! && n > rules.desired! * 0.2))
    return { ok: false, reason: "Reply mentions a price the seller didn't approve." };
  return { ok: true };
}

export function money(n: number | null | undefined, currency: PricingRules["currency"]) {
  if (n == null) return "—";
  return currency === "KZT"
    ? `${Math.round(n).toLocaleString("ru-RU")} ₸`
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
