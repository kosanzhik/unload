import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, decide, extractWhen } from "../lib/agent/salesAgent";
import { convo, product } from "./fixtures";

test("brief example: $120 offer on Sell Fast → counter $135, minimum never disclosed", () => {
  const d = decide(product(), convo(), "Would you accept $120?");
  assert.equal(d.counter, 135);
  assert.equal(d.reply, "The seller is asking $150. I can offer $135 if that works for you.");
  assert.ok(!d.reply.includes("130"));
});

test("Balanced counters at $140, Get More Money at $145", () => {
  assert.equal(decide(product({ goal: "balanced" }), convo(), "Would you take $120?").counter, 140);
  assert.equal(decide(product({ goal: "max" }), convo(), "Would you take $120?").counter, 145);
});

test("buyer agrees after a counter → offer at the counter price with timing", () => {
  const d = decide(product(), convo({ lastCounter: 135 }), "OK, deal. Can I pick it up tomorrow evening?");
  assert.deepEqual(d.offer, { kind: "purchase", price: 135, when: "tomorrow evening" });
  assert.ok(d.reply.includes("$135"));
});

test("agreement with a lower explicit price is treated as a new low offer", () => {
  const d = decide(product(), convo({ lastCounter: 135 }), "Deal at $125?");
  assert.equal(d.offer, undefined);
  assert.equal(d.counter, 135);
});

test("answers from verified facts, asks the seller otherwise", () => {
  const known = decide(product(), convo(), "Is the power cord included?");
  assert.ok(known.reply.includes("power cable is included"));
  const unknown = decide(product(), convo(), "Does the HDMI port actually work?");
  assert.equal(unknown.question?.topic, "hdmi");
  assert.ok(!/yes|works/i.test(unknown.reply.replace("work", "")) || unknown.reply.includes("don't want to guess"));
});

test("payment and off-platform requests escalate", () => {
  assert.ok(decide(product(), convo(), "Can I pay with Zelle?").escalate);
  assert.ok(decide(product(), convo(), "Text me on WhatsApp").escalate);
});

test("only offers the seller's logistics", () => {
  const d = decide(product({ logistics: { pickup: true, shipping: false, area: "Midtown" } }), convo(), "Do you ship?");
  assert.ok(d.reply.includes("local pickup (Midtown)"));
  assert.ok(!/shipping\b/i.test(d.reply.replace("pickup", "")));
});

test("price questions never reveal the minimum", () => {
  const d = decide(product(), convo(), "What's your lowest price?");
  assert.ok(!/130|135/.test(d.reply));
});

test("intent helpers", () => {
  assert.ok(classify("Does it have 2 HDMI ports?").includes("question"));
  assert.equal(extractWhen("can I come Saturday at 3pm?"), "Saturday at 3pm");
});
