import { classify, decide, needsApproval } from "../lib/agent/salesAgent";
import { evaluateOffer, guardReply, parseOffer } from "../lib/negotiation/policy";
import type { Product, Conversation } from "../lib/core/types";
import { DEFAULT_SETTINGS } from "./settings";

let fail = 0;
const ok = (cond: boolean, msg: string) => { console.log(cond ? "✓" : "✗", msg); if (!cond) fail++; };

const rules = { currency: "USD" as const, desired: 150, minimum: 130, negotiationEnabled: true, maxDiscountPct: 20 };
const p: Product = {
  id: "p1", createdAt: 0, status: "listed", demo: true, photos: [], title: "27-inch computer monitor with stand",
  description: "", category: "Computers & accessories", condition: "Good", brand: "Dell", model: "", attributes: [],
  missing: [], sellerQuestions: [], evidence: [], pendingListingUpdates: [], analysis: null, agentEnabled: true, pricing: rules,
  facts: [{ id: "f1", topic: "charger", question: "Is the power cable included?", answer: "Yes, the power cable is included", source: "seller", evidenceIds: [], createdAt: 0, inListing: true }],
};
const c: Conversation = { id: "c1", productId: "p1", marketplace: "mock", buyerRef: "b", demo: true, messages: [], lowOfferCount: 0, updatedAt: 0, unread: false };
const S = DEFAULT_SETTINGS;

const e = evaluateOffer(120, rules);
ok(e.action === "counter" && e.counter === 135, `120 vs 150/130 → counter 135 (${JSON.stringify(e)})`);
ok(evaluateOffer(140, rules).action === "forward", "140 → forward to seller");
ok(evaluateOffer(160, rules).action === "forward", "160 → forward");
ok(evaluateOffer(120, { ...rules, negotiationEnabled: false }).action === "hold", "negotiation off → hold");
ok(parseOffer("Would you accept $120?") === 120, "parse $120");
ok(parseOffer("отдадите за 120 000 тг?") === 120000, "parse 120 000 тг");

const d1 = decide(p, c, "Would you accept $120?", S);
ok(d1.reply === "The seller is asking $150. I can offer $135 if that works for you.", `counter reply: ${d1.reply}`);
ok(!d1.reply.includes("130"), "minimum never disclosed");
ok(needsApproval(d1, S, true) === true, "assisted: negotiation needs review");
ok(needsApproval(d1, { ...S, mode: "autopilot", allowedReplies: { ...S.allowedReplies, pricing: true } }, true) === false, "autopilot+pricing allowed: sends");
ok(needsApproval(d1, { ...S, mode: "autopilot" }, false) === true, "autopilot but negotiation disabled: review");

const d2 = decide(p, c, "Does the HDMI port actually work?", S);
ok(d2.category === "escalation" && d2.task?.topic === "hdmi", `unknown fact → task (${d2.reply})`);
ok(d2.reply.startsWith("That hasn't been verified yet"), "honest holding reply");

const d3 = decide(p, c, "Is the power cord included?", S);
ok(d3.category === "condition" && d3.reply.includes("power cable is included"), `known fact answered: ${d3.reply}`);

const d4 = decide(p, c, "Can I come see it tomorrow?", S);
ok(d4.deal?.kind === "inspection", "inspection → deal request");
const d5 = decide(p, c, "I'll take it for $140", S);
ok(d5.deal?.kind === "purchase" && d5.deal.offeredPrice === 140, `purchase intent → deal @140`);
const d6 = decide(p, c, "Can I pay with Zelle?", S);
ok(d6.category === "escalation" && !!d6.escalate, "payment → escalate");
const d7 = decide(p, c, "Is it still available?", S);
ok(d7.category === "availability" && needsApproval(d7, S, true) === false, "availability auto-sent in assisted");
ok(needsApproval(d7, { ...S, mode: "manual" }, true), "manual: everything needs approval");
const d8 = decide(p, c, "What's your lowest price?", S);
ok(!/130|135/.test(d8.reply), `price question reveals no floor: ${d8.reply}`);
ok(!guardReply("I could do $130 for you.", rules, [135]).ok, "guard blocks minimum leak");
ok(!guardReply("Sure, $110 works.", rules, [135]).ok, "guard blocks unapproved price");
ok(guardReply("The seller is asking $150. I can offer $135.", rules, [135]).ok, "guard allows approved amounts");
ok(classify("Does it have 2 HDMI ports?").includes("question"), "spec question not treated as offer");
process.exit(fail ? 1 : 0);
