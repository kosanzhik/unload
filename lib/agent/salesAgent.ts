import type { Conversation, OfferKind, Product } from "../core/types";
import { answerFromRecord, findFact, questionForTopic, topicsFor } from "../knowledge/kb";
import { evaluateOffer, money, parseOffer } from "../negotiation/policy";

/**
 * AI Sales Agent — decision layer (deterministic).
 * Decides WHAT may be said from verified facts, the seller's logistics and the
 * negotiation policy. When Claude is available it may reword the reply; the
 * result is re-checked by the price guard before sending.
 */

export type Intent =
  | "off_platform"
  | "payment"
  | "agree"
  | "purchase"
  | "meeting"
  | "offer"
  | "price_question"
  | "availability"
  | "logistics"
  | "question"
  | "smalltalk";

export type AgentDecision = {
  intent: Intent;
  reply: string;
  rationale: string;
  /** amounts this reply may mention */
  allowedAmounts: number[];
  /** a new counteroffer the agent is making */
  counter?: number;
  /** buyer is ready → offer for the seller to accept/reject/counter */
  offer?: { kind: OfferKind; price: number | null; when: string };
  /** needs the seller's knowledge */
  question?: { topic: string; question: string };
  /** notify the seller (payment, off-platform, repeated lowballs) */
  escalate?: string;
  lowOffer?: boolean;
};

const has = (re: RegExp, t: string) => re.test(t);

export function classify(text: string): Intent[] {
  const t = text.toLowerCase();
  const out: Intent[] = [];
  if (has(/whats\s?app|telegram|\bviber\b|my (phone|number|email)|text me|call me|e-?mail me|\+?\d[\d\s-]{8,}\d/, t)) out.push("off_platform");
  if (has(/\bpay(ment|pal)?\b|venmo|zelle|cash app|wire|transfer|prepay|deposit|credit card/, t)) out.push("payment");
  if (has(/\b(deal|sounds good|sounds fair|works for me|that works|agreed|it'?s a deal|ok(ay)?,? (let'?s|i'?ll)|you got a deal)\b/, t)) out.push("agree");
  if (has(/i('| wi)ll take it|i want (to buy )?it|ready to (buy|pay)|i('| a)m buying|i'?ll buy/, t)) out.push("purchase");
  if (has(/see it|look at it|check it (out|in person)|inspect|test it|try it|come (by|over|see)|in person|pick (it )?up (it )?(today|tomorrow|tonight|this)/, t)) out.push("meeting");
  if (parseOffer(text) != null) out.push("offer");
  if (!out.includes("offer") && has(/lowest|best price|negotiable|discount|final price|firm|cheaper|any flexibility|go down/, t)) out.push("price_question");
  if (has(/still (available|for sale|have it)|is (it|this) (available|sold)|available\??$|sold yet/, t)) out.push("availability");
  if (has(/pick ?up|ship(ping)?|deliver(y)?|where (are you|is it|can we)|location|meet\b|courier/, t)) out.push("logistics");
  if (out.length === 0) out.push(has(/\?|does|is there|any |how |what |which |can /, t) ? "question" : "smalltalk");
  return out;
}

/** Buyer's proposed timing in their own words ("tomorrow", "Saturday at 3pm"). */
export function extractWhen(text: string): string {
  const m = text.match(
    /\b(today|tonight|tomorrow(?: (?:morning|afternoon|evening|night))?|this (?:weekend|evening|afternoon|morning)|(?:on )?(?:mon|tues|wednes|thurs|fri|satur|sun)day(?: (?:morning|afternoon|evening))?)(?:\s+(?:at|around|after|before)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,
  );
  return m ? m[0].trim() : "";
}

const PRIORITY: Intent[] = ["off_platform", "payment", "agree", "purchase", "meeting", "offer", "price_question", "question", "availability", "logistics", "smalltalk"];

export function shortName(p: Pick<Product, "title">) {
  return p.title.split(/ [—–-] |,| with | for /i)[0];
}

function logisticsLine(p: Product) {
  const l = p.logistics;
  const opts = [l.pickup && `local pickup${l.area ? ` (${l.area})` : ""}`, l.shipping && "shipping"].filter(Boolean);
  return opts.length ? `The seller offers ${opts.join(" or ")}.` : "The seller will confirm pickup or delivery details.";
}

export function decide(product: Product, convo: Conversation, buyerText: string): AgentDecision {
  const intents = classify(buyerText);
  const intent = PRIORITY.find((i) => intents.includes(i))!;
  const rules = product.pricing;
  const fmt = (n: number | null) => money(n, rules.currency);
  const name = shortName(product);
  const when = extractWhen(buyerText);
  const said = parseOffer(buyerText);

  // Agreement / purchase / meeting with an explicit price below the range is really a counter-offer.
  if ((intent === "agree" || intent === "purchase" || intent === "meeting") && said != null) {
    const e = evaluateOffer(said, rules, product.goal, convo.lastCounter);
    if (e.action === "counter") return offerDecision(product, convo, said, intents);
  }

  switch (intent) {
    case "off_platform":
      return {
        intent,
        reply: "Let's keep the conversation here on the platform for now — it keeps things safe for both of us. The seller will follow up.",
        rationale: "Buyer asked to move off-platform. Escalated to the seller.",
        allowedAmounts: [],
        escalate: "A buyer asked to continue off-platform",
      };

    case "payment":
      return {
        intent,
        reply: "The seller confirms payment details directly once you agree on the deal. I've passed your question along.",
        rationale: "Payment questions are never answered by the agent.",
        allowedAmounts: [],
        escalate: "A buyer asked about payment",
      };

    case "agree":
    case "purchase":
    case "meeting": {
      const price = said ?? convo.lastCounter ?? rules.desired;
      const kind = intent === "meeting" && !intents.includes("agree") && !intents.includes("purchase") ? "meeting" : "purchase";
      return {
        intent,
        reply:
          kind === "meeting"
            ? `Sure — I've asked the seller about a time for you to see the ${name}${when ? ` ${when}` : ""}. ${logisticsLine(product)}`
            : `Great! I've sent ${price != null ? `your offer of ${fmt(price)}` : "your request"}${when ? ` and ${when}` : ""} to the seller to confirm. I'll get back to you shortly.`,
        rationale: `Buyer is ready (${kind}). Only the seller can accept, so it went to Buyer Offers.`,
        allowedAmounts: price != null ? [price] : [],
        offer: { kind, price, when },
      };
    }

    case "offer":
      return offerDecision(product, convo, said!, intents);

    case "price_question":
      return {
        intent,
        reply:
          rules.desired == null
            ? "The seller hasn't set a price yet — I'll ask them."
            : `The asking price is ${fmt(convo.lastCounter ?? rules.desired)}. What did you have in mind?`,
        rationale: "Restated the public price (or the counteroffer already made). The private minimum is never shared.",
        allowedAmounts: convo.lastCounter ? [convo.lastCounter] : [],
      };

    case "availability":
      return {
        intent,
        reply: product.status === "sold" ? `Sorry, the ${name} has been sold.` : `Yes, the ${name} is still available. ${logisticsLine(product)}`,
        rationale: "Availability comes from the listing status.",
        allowedAmounts: [],
      };

    case "logistics":
      return { intent, reply: logisticsLine(product), rationale: "Only the options the seller enabled.", allowedAmounts: [] };

    case "question": {
      const fact = findFact(product, buyerText);
      if (fact)
        return {
          intent,
          reply: `${fact.answer}${/[.!?]$/.test(fact.answer) ? "" : "."} (Confirmed by the seller.)`,
          rationale: `Answered from verified info: “${fact.question}”.`,
          allowedAmounts: [],
        };
      const rec = answerFromRecord(product, buyerText);
      if (rec) return { intent, reply: rec, rationale: "Answered from the seller-approved listing details.", allowedAmounts: [] };
      const topic = topicsFor(buyerText)[0] ?? buyerText.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 40);
      return {
        intent,
        reply: "Good question — I don't want to guess. I'll check with the seller and get back to you.",
        rationale: "Not in the verified info → question sent to the seller. The agent never guesses.",
        allowedAmounts: [],
        question: { topic, question: topicsFor(buyerText)[0] ? questionForTopic(topic, buyerText) : buyerText.trim() },
      };
    }

    default:
      return {
        intent: "smalltalk",
        reply: `Hi! Thanks for your interest in the ${name}. Any questions I can help with?`,
        rationale: "Friendly acknowledgment, no commitments.",
        allowedAmounts: [],
      };
  }
}

function offerDecision(product: Product, convo: Conversation, offer: number, intents: Intent[]): AgentDecision {
  const rules = product.pricing;
  const fmt = (n: number | null) => money(n, rules.currency);
  const e = evaluateOffer(offer, rules, product.goal, convo.lastCounter);
  const when = "";
  if (e.action === "no_price")
    return {
      intent: "offer",
      reply: "Thanks for the offer — I'll pass it to the seller.",
      rationale: e.reason,
      allowedAmounts: [offer],
      escalate: "Offer received but no asking price is set",
    };
  if (e.action === "accept_for_review")
    return {
      intent: "offer",
      reply: `Thanks! ${fmt(offer)} works for me to pass along — I've sent it to the seller to confirm.`,
      rationale: e.reason,
      allowedAmounts: [offer],
      offer: { kind: intents.includes("meeting") ? "meeting" : "offer", price: offer, when },
    };
  const repeated = convo.lastCounter != null;
  return {
    intent: "offer",
    reply: repeated
      ? `I understand. The best I can do is ${fmt(e.counter)}.`
      : `The seller is asking ${fmt(rules.desired)}. I can offer ${fmt(e.counter)} if that works for you.`,
    rationale: e.reason,
    allowedAmounts: [e.counter, offer],
    counter: e.counter,
    lowOffer: true,
    escalate: convo.lowOfferCount + 1 >= 3 ? "A buyer keeps offering below your range" : undefined,
  };
}

/** Autopilot on → the agent sends; off → the seller approves each reply. */
export function needsApproval(autopilot: boolean) {
  return !autopilot;
}
