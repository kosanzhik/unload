import type { PricingRules } from "../core/types";

/**
 * Negotiation Policy Engine.
 * Pure functions: decides what the agent may say about price. The private
 * minimum never leaves this module except as a bounded counteroffer.
 */

export type OfferDecision =
  | { action: "no_rules"; reason: string }
  | { action: "forward"; offer: number; reason: string } // at/above asking or acceptable: seller confirms
  | { action: "counter"; offer: number; counter: number; reason: string }
  | { action: "hold"; offer: number; reason: string }; // negotiation off: restate asking price only

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function step(price: number) {
  if (price >= 100_000) return 5_000; // KZT-sized numbers
  if (price >= 10_000) return 1_000;
  if (price >= 1_000) return 50;
  if (price >= 100) return 5;
  return 1;
}

/** Lowest price the agent may ever propose. */
export function floor(rules: PricingRules): number | null {
  if (rules.desired == null) return null;
  const capped = rules.desired * (1 - Math.min(Math.max(rules.maxDiscountPct, 0), 100) / 100);
  return Math.max(rules.minimum ?? rules.desired, capped);
}

export function evaluateOffer(offer: number, rules: PricingRules): OfferDecision {
  const { desired } = rules;
  if (desired == null) return { action: "no_rules", reason: "No asking price set yet." };

  if (offer >= desired) return { action: "forward", offer, reason: "Offer meets the asking price." };

  if (!rules.negotiationEnabled || rules.minimum == null) {
    return { action: "hold", offer, reason: "Negotiation is off — the agent only restates the asking price." };
  }

  const low = floor(rules)!;
  // Concede a quarter of the gap between asking and floor, never below the floor.
  const counter = Math.max(low, Math.min(desired, roundTo(desired - (desired - low) * 0.75, step(desired))));

  if (offer >= counter) {
    return { action: "forward", offer, reason: "Offer is within the seller's approved range." };
  }
  return {
    action: "counter",
    offer,
    counter,
    reason: `Offer is below the approved range; a counteroffer of ${counter} stays within it.`,
  };
}

/** Extracts a money amount from a buyer message ("would you take $120?", "120k", "120 000 тг"). */
export function parseOffer(text: string): number | null {
  const m = text.replace(/ /g, " ").match(/(?:\$|₸|kzt|usd)?\s*(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)\s*(k|к|тыс)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/[ ,]/g, ""));
  if (m[2]) n *= 1000;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Last line of defense for any outgoing text (template or LLM):
 * only amounts the policy allows may appear.
 */
export function guardReply(text: string, rules: PricingRules, allowed: number[]): { ok: boolean; reason?: string } {
  const nums = [...text.matchAll(/(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/[ ,]/g, "")));
  const money = nums.filter((n) => n >= 10); // ignore small counts like "2 cables", "27-inch"
  const ok = new Set([...allowed, ...(rules.desired != null ? [rules.desired] : [])]);
  if (rules.minimum != null && !ok.has(rules.minimum) && money.includes(rules.minimum))
    return { ok: false, reason: "Reply would reveal the private minimum price." };
  const stray = money.filter((n) => !ok.has(n));
  if (stray.some((n) => rules.desired != null && n < rules.desired && n > rules.desired * 0.2))
    return { ok: false, reason: "Reply mentions a price the seller didn't approve." };
  return { ok: true };
}

export function money(n: number | null | undefined, currency: PricingRules["currency"]) {
  if (n == null) return "—";
  return currency === "KZT"
    ? `${Math.round(n).toLocaleString("ru-RU")} ₸`
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
