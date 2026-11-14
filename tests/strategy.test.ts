import { test } from "node:test";
import assert from "node:assert/strict";
import { strategyTips, suggestedMinimum } from "../lib/strategy/engine";
import type { Listing, Offer } from "../lib/core/types";
import { convo, product } from "./fixtures";

const DAY = 86_400_000;
const live = (daysAgo: number): Listing => ({
  id: "l1", productId: "p1", marketplace: "mock", status: "active", title: "", description: "", price: 150, currency: "USD", publishedAt: Date.now() - daysAgo * DAY,
});

test("suggested minimums follow the goal", () => {
  assert.equal(suggestedMinimum(150, "fast"), 120);
  assert.equal(suggestedMinimum(150, "balanced"), 130);
  assert.equal(suggestedMinimum(150, "max"), 140);
});

test("quiet listing → Sell Fast suggests a lower price after 2 days, never below minimum", () => {
  const tips = strategyTips(product(), [live(3)], [], []);
  const drop = tips.find((t) => t.id.startsWith("drop-"));
  assert.ok(drop, "expected a price tip");
  assert.equal(drop!.action?.type === "set_price" && drop!.action.price, 140);
  const capped = strategyTips(product({ pricing: { currency: "USD", desired: 150, minimum: 148 } }), [live(3)], [], []);
  const c = capped.find((t) => t.id.startsWith("drop-"))!;
  assert.ok(c.action?.type === "set_price" && c.action.price >= 148);
});

test("Get More Money waits 7 days before suggesting a change", () => {
  assert.equal(strategyTips(product({ goal: "max" }), [live(3)], [], []).some((t) => t.id.startsWith("drop-")), false);
  assert.equal(strategyTips(product({ goal: "max" }), [live(8)], [], []).some((t) => t.id.startsWith("drop-")), true);
});

test("no price tip once buyers are talking", () => {
  const c = convo({ messages: [{ id: "m", role: "buyer", text: "hi", status: "received", createdAt: 0 }] });
  assert.equal(strategyTips(product(), [live(5)], [c], []).some((t) => t.id.startsWith("drop-")), false);
});

test("a real pending offer is surfaced first", () => {
  const o: Offer = { id: "o1", productId: "p1", conversationId: "c1", marketplace: "mock", buyerRef: "b", kind: "purchase", price: 135, currency: "USD", when: "tomorrow", summary: "", status: "pending", createdAt: 0 };
  const tips = strategyTips(product(), [live(1)], [], [o]);
  assert.equal(tips[0].title, "A buyer offered $135");
});

test("demo marketplace reports no views, so tips never invent them", () => {
  const tips = strategyTips(product(), [live(1)], [], []);
  assert.ok(!tips.some((t) => /views/.test(t.body)));
});

test("sold items get no tips", () => {
  assert.equal(strategyTips(product({ status: "sold" }), [live(9)], [], []).length, 0);
});
