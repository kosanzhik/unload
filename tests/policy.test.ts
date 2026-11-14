import { test } from "node:test";
import assert from "node:assert/strict";
import { counterFor, evaluateOffer, guardReply, parseOffer } from "../lib/negotiation/policy";

const rules = { currency: "USD" as const, desired: 150, minimum: 130 };

test("counteroffer depends on the selling goal (brief example: $150 ask, $130 min)", () => {
  assert.equal(counterFor(rules, "fast"), 135);
  assert.equal(counterFor(rules, "balanced"), 140);
  assert.equal(counterFor(rules, "max"), 145);
});

test("counteroffer never goes below the private minimum", () => {
  for (const g of ["fast", "balanced", "max"] as const) {
    for (const min of [100, 129, 140, 149, 150]) {
      const c = counterFor({ ...rules, minimum: min }, g)!;
      assert.ok(c >= min && c <= 150, `${g} min ${min} → ${c}`);
    }
  }
});

test("$120 offer → counter at the goal's level", () => {
  const d = evaluateOffer(120, rules, "fast");
  assert.equal(d.action, "counter");
  assert.equal(d.action === "counter" && d.counter, 135);
});

test("offer inside the range goes to the seller, never auto-accepted", () => {
  assert.equal(evaluateOffer(138, rules, "fast").action, "accept_for_review");
  assert.equal(evaluateOffer(138, rules, "max").action, "counter");
  assert.equal(evaluateOffer(160, rules, "max").action, "accept_for_review");
});

test("after a counteroffer the agent holds instead of dropping further", () => {
  const d = evaluateOffer(125, rules, "fast", 135);
  assert.equal(d.action === "counter" && d.counter, 135);
});

test("parses buyer offers", () => {
  assert.equal(parseOffer("Would you take $120?"), 120);
  assert.equal(parseOffer("I can pay 120 dollars"), 120);
  assert.equal(parseOffer("how about 1.2k"), 1200);
  assert.equal(parseOffer("отдадите за 120 000 тг?"), 120000);
  assert.equal(parseOffer("Is it 27 inches?"), null);
  assert.equal(parseOffer("Does it have 2 HDMI ports?"), null);
});

test("price guard blocks leaks of the minimum and unapproved prices", () => {
  assert.equal(guardReply("I could do $130 for you.", rules, [135]).ok, false);
  assert.equal(guardReply("Sure, $110 works.", rules, [135]).ok, false);
  assert.equal(guardReply("The seller is asking $150. I can offer $135.", rules, [135]).ok, true);
  assert.equal(guardReply("It's a 27-inch monitor.", rules, []).ok, true);
});
