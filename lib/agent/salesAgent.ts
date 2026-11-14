import type {
  AutopilotSettings,
  Conversation,
  DealKind,
  Product,
  ReplyCategory,
} from "../core/types";
import { answerFromRecord, findFact, questionForTopic, topicsFor } from "../knowledge/kb";
import { evaluateOffer, money, parseOffer } from "../negotiation/policy";

/**
 * AI Sales Agent — decision layer.
 * Deterministic and policy-bound: it decides WHAT may be said. When Claude is
 * enabled, /api/ai/reply may rephrase the text, and the result is checked again
 * by the policy guard before it can be sent.
 */

export type Intent =
  | "off_platform"
  | "payment"
  | "purchase"
  | "inspection"
  | "offer"
  | "price_question"
  | "availability"
  | "logistics"
  | "question"
  | "smalltalk";

export type AgentDecision = {
  intent: Intent;
  category: ReplyCategory | "escalation" | "deal";
  reply: string;
  rationale: string;
  /** price amounts this reply is allowed to mention */
  allowedAmounts: number[];
  /** create a verification task for the seller */
  task?: { topic: string; question: string; instruction: string };
  /** create a structured deal request */
  deal?: { kind: DealKind; offeredPrice: number | null; conditions: string };
  /** notify the owner without a deal/task */
  escalate?: string;
  lowOffer?: boolean;
};

const has = (re: RegExp, t: string) => re.test(t);

export function classify(text: string): Intent[] {
  const t = text.toLowerCase();
  const out: Intent[] = [];
  if (has(/whats\s?app|telegram|\bviber\b|my (phone|number|email)|text me|call me|e-?mail me|\+?\d[\d\s-]{8,}\d/, t)) out.push("off_platform");
  if (has(/\bpay(ment|pal)?\b|venmo|zelle|cash app|wire|transfer|prepay|deposit|credit card/, t)) out.push("payment");
  if (has(/i('| wi)ll take it|i want (to buy )?it|ready to (buy|pay)|i('| a)m buying|let'?s do (it|the deal)|deal\b|i'?ll buy/, t)) out.push("purchase");
  if (has(/see it|look at it|check it (out|in person)|inspect|test it|try it|come (by|over|see)|in person|viewing/, t)) out.push("inspection");
  const offer = parseOffer(t);
  if (offer != null && has(/\$|₸|tenge|тг|would you|will you|take|accept|offer|how about|can you do|for \d|\bdo \d|lowest|ok with|\d+\s*\?/, t))
    out.push("offer");
  if (!out.includes("offer") && has(/lowest|best price|negotiable|discount|final price|firm|cheaper|any flexibility|go down/, t)) out.push("price_question");
  if (has(/still (available|for sale|have it)|is (it|this) (available|sold)|available\??$|sold yet/, t)) out.push("availability");
  if (has(/pick ?up|ship(ping)?|deliver(y)?|where (are you|is it|can we)|location|meet|courier|post/, t)) out.push("logistics");
  if (out.length === 0) out.push(has(/\?|does|is there|any |how |what |which |can /, t) ? "question" : "smalltalk");
  return out;
}

const PRIORITY: Intent[] = [
  "off_platform",
  "payment",
  "purchase",
  "inspection",
  "offer",
  "price_question",
  "question",
  "availability",
  "logistics",
  "smalltalk",
];

function shortName(p: Product) {
  return p.title.split(/ [—–-] /)[0];
}

function logisticsLine(s: AutopilotSettings) {
  const opts = [s.pickup && `local pickup${s.meetingArea ? ` (${s.meetingArea})` : ""}`, s.shipping && "shipping"].filter(Boolean);
  return opts.length ? `The seller offers ${opts.join(" or ")}.` : "The seller will confirm pickup or delivery details.";
}

export function decide(product: Product, convo: Conversation, buyerText: string, settings: AutopilotSettings): AgentDecision {
  const intents = classify(buyerText);
  const intent = PRIORITY.find((i) => intents.includes(i))!;
  const rules = product.pricing;
  const fmt = (n: number | null) => money(n, rules.currency);
  const name = shortName(product);

  switch (intent) {
    case "off_platform":
      return {
        intent,
        category: "escalation",
        reply: "Let's keep the conversation here on the platform for now — it keeps things safe for both of us. The seller will follow up.",
        rationale: "Buyer asked to move off-platform. Escalated to the seller.",
        allowedAmounts: [],
        escalate: settings.escalation.offPlatformContact ? "Buyer asked to continue off-platform" : undefined,
      };

    case "payment":
      return {
        intent,
        category: "escalation",
        reply: "Payment details are confirmed by the seller directly once you agree on the deal. I've passed your question along.",
        rationale: "Payment questions are never answered by the agent.",
        allowedAmounts: [],
        escalate: settings.escalation.paymentQuestions ? "Buyer asked about payment" : undefined,
      };

    case "purchase":
    case "inspection": {
      const offer = parseOffer(buyerText);
      const kind: DealKind = intent === "purchase" ? "purchase" : "inspection";
      return {
        intent,
        category: "deal",
        reply:
          kind === "purchase"
            ? `Great — I've let the seller know you'd like to buy the ${name}. They'll confirm and arrange the details with you shortly. ${logisticsLine(settings)}`
            : `Sure — I've asked the seller about a time for you to see the ${name}. ${logisticsLine(settings)}`,
        rationale: `Buyer shows ${kind} intent → Deal Request created for the seller's approval. Nothing is finalized by the agent.`,
        allowedAmounts: offer ? [offer] : [],
        deal: {
          kind,
          offeredPrice: offer ?? rules.desired,
          conditions: [settings.pickup && "pickup", settings.shipping && "shipping", settings.meetingArea].filter(Boolean).join(" · "),
        },
      };
    }

    case "offer": {
      const offer = parseOffer(buyerText)!;
      const d = evaluateOffer(offer, rules);
      const low = convo.lowOfferCount + (d.action === "counter" || d.action === "hold" ? 1 : 0);
      if (d.action === "no_rules")
        return {
          intent,
          category: "escalation",
          reply: "Thanks for the offer — I'll pass it to the seller, who hasn't set a price yet.",
          rationale: d.reason,
          allowedAmounts: [offer],
          escalate: "Offer received but no asking price is set",
        };
      if (d.action === "forward")
        return {
          intent,
          category: "deal",
          reply: `Thanks! I'll pass your offer of ${fmt(offer)} to the seller to confirm.`,
          rationale: `${d.reason} Only the seller can accept, so a Deal Request was created.`,
          allowedAmounts: [offer],
          deal: { kind: "offer", offeredPrice: offer, conditions: "" },
        };
      if (d.action === "counter")
        return {
          intent,
          category: "pricing",
          reply: `The seller is asking ${fmt(rules.desired)}. I can offer ${fmt(d.counter)} if that works for you.`,
          rationale: `${d.reason} (Seller enabled negotiation.)`,
          allowedAmounts: [d.counter, offer],
          lowOffer: true,
          escalate: settings.escalation.repeatedLowOffers && low >= 3 ? "Buyer keeps offering below the approved range" : undefined,
        };
      return {
        intent,
        category: "pricing",
        reply: `Thanks for the offer. The asking price is ${fmt(rules.desired)}; I'll let the seller know you're interested.`,
        rationale: d.reason,
        allowedAmounts: [offer],
        lowOffer: true,
        escalate: settings.escalation.repeatedLowOffers && low >= 3 ? "Buyer keeps offering below the asking price" : undefined,
      };
    }

    case "price_question":
      return {
        intent,
        category: "pricing",
        reply:
          rules.desired == null
            ? "The seller hasn't set a price yet — I'll ask them."
            : rules.negotiationEnabled
              ? `The asking price is ${fmt(rules.desired)}. The seller is open to reasonable offers — what did you have in mind?`
              : `The asking price is ${fmt(rules.desired)}.`,
        rationale: "Restated the public asking price only. The private minimum is never shared.",
        allowedAmounts: [],
      };

    case "availability":
      return {
        intent,
        category: "availability",
        reply: product.status === "sold" ? `Sorry, the ${name} has been sold.` : `Yes, the ${name} is still available. ${logisticsLine(settings)}`,
        rationale: "Availability comes from the listing status.",
        allowedAmounts: [],
      };

    case "logistics":
      return {
        intent,
        category: "logistics",
        reply: logisticsLine(settings),
        rationale: "Only the delivery options the seller enabled in Autopilot Settings.",
        allowedAmounts: [],
      };

    case "question": {
      const fact = findFact(product, buyerText);
      if (fact) {
        const ev = fact.evidenceIds.length
          ? " The seller also recorded a short check — it shows how it worked at the time, but can't guarantee future condition."
          : "";
        return {
          intent,
          category: "condition",
          reply: `${fact.answer}${/[.!?]$/.test(fact.answer) ? "" : "."} (Confirmed by the seller.)${ev}`,
          rationale: `Answered from the verified knowledge base: “${fact.question}”.`,
          allowedAmounts: [],
        };
      }
      const rec = answerFromRecord(product, buyerText);
      if (rec)
        return {
          intent,
          category: "condition",
          reply: rec,
          rationale: "Answered from the seller-reviewed product details.",
          allowedAmounts: [],
        };
      const topic = topicsFor(buyerText)[0] ?? buyerText.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 40);
      const question = topicsFor(buyerText)[0] ? questionForTopic(topic, buyerText) : buyerText.trim();
      return {
        intent,
        category: "escalation",
        reply: "That hasn't been verified yet. I'll ask the seller to check and get back to you.",
        rationale: "Not in the verified knowledge base → verification task for the seller. The agent never guesses.",
        allowedAmounts: [],
        task: {
          topic,
          question,
          instruction: `A buyer asked: “${buyerText.trim()}”. Please check and answer — optionally attach a photo or short video.`,
        },
      };
    }

    default:
      return {
        intent: "smalltalk",
        category: "availability",
        reply: `Hi! Thanks for your interest in the ${name}. Any questions I can help with?`,
        rationale: "Friendly acknowledgment, no commitments.",
        allowedAmounts: [],
      };
  }
}

/** Whether the seller must approve this reply before it is sent. */
export function needsApproval(d: AgentDecision, s: AutopilotSettings, negotiationEnabled: boolean): boolean {
  if (s.mode === "manual") return true;
  if (d.category === "escalation" || d.category === "deal") return false; // holding replies commit to nothing
  if (d.category === "pricing") {
    if (s.mode === "assisted") return d.intent === "offer"; // negotiation always reviewed in assisted
    return !s.allowedReplies.pricing || (d.intent === "offer" && !negotiationEnabled);
  }
  return !s.allowedReplies[d.category];
}
