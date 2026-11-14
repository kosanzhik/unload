import type { Conversation, Product } from "../lib/core/types";

export function product(over: Partial<Product> = {}): Product {
  return {
    id: "p1",
    createdAt: 0,
    status: "selling",
    demo: true,
    photos: [],
    title: "27-inch computer monitor with stand",
    description: "27-inch monitor with stand.",
    category: "Computers & accessories",
    condition: "Good",
    brand: "Dell",
    model: "",
    attributes: [],
    missing: [],
    sellerQuestions: [],
    facts: [{ id: "f1", topic: "charger", question: "Is the power cable included?", answer: "Yes, the power cable is included", source: "seller", createdAt: 0, inListing: true }],
    goal: "fast",
    pricing: { currency: "USD", desired: 150, minimum: 130 },
    autopilot: true,
    logistics: { pickup: true, shipping: false, area: "Midtown" },
    analysis: null,
    dismissedTips: [],
    ...over,
  };
}

export function convo(over: Partial<Conversation> = {}): Conversation {
  return { id: "c1", productId: "p1", marketplace: "mock", buyerRef: "Demo buyer", demo: true, messages: [], lastCounter: null, lowOfferCount: 0, updatedAt: 0, unread: false, ...over };
}
