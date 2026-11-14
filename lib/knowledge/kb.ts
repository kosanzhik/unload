import type { Fact, Product } from "../core/types";

/**
 * Product Knowledge Base (Living Listing).
 * Maps buyer questions to topics and finds the verified fact that answers them.
 */

const TOPICS: [topic: string, pattern: RegExp, question: string][] = [
  ["hdmi", /\bhdmi\b/i, "Does the HDMI port work?"],
  ["displayport", /display\s?port|\bdp\b/i, "Does the DisplayPort work?"],
  ["usb", /\busb\b|type-?c/i, "Do the USB ports work?"],
  ["ports", /\bports?\b|inputs?|connectors?/i, "Which ports does it have, and do they work?"],
  ["dead pixels", /dead pixel|stuck pixel|pixels?/i, "Are there any dead or stuck pixels?"],
  ["screen", /screen|display|panel|backlight|bleed/i, "Is the screen in good shape?"],
  ["scratches", /scratch|scuff|dent|crack|chip|wear|damage/i, "Are there scratches or other wear?"],
  ["battery", /battery|charge (hold|last)|battery life/i, "How is the battery life?"],
  ["charger", /charger|power (cable|cord|adapter|supply)|adapter/i, "Is the power cable or charger included?"],
  ["cables", /cables?|cords?|wires?/i, "Which cables are included?"],
  ["stand", /\bstand\b|mount|vesa/i, "Is the stand included / is it VESA-mountable?"],
  ["box", /original box|\bbox\b|packaging/i, "Does it come with the original box?"],
  ["receipt", /receipt|invoice|proof of purchase/i, "Do you have the receipt?"],
  ["warranty", /warranty|guarantee/i, "Is there any warranty left?"],
  ["age", /how old|when (did you )?(buy|bought|purchase)|age of|years? old/i, "How old is it?"],
  ["works", /does it (work|turn on|power on)|working|functional|fully work|any (issues|problems|defects)/i, "Does everything work?"],
  ["sound", /sound|audio|crackl|noise|buzz|speaker/i, "Any sound issues?"],
  ["microphone", /\bmic(rophone)?\b/i, "Does the microphone work?"],
  ["bluetooth", /bluetooth|pair(ing)?|wireless/i, "Does Bluetooth / wireless work?"],
  ["keys", /\bkeys?\b|switch(es)?|keycaps?/i, "Do all keys work? Which switches?"],
  ["smoke", /smok(e|er|ing)|pets?|odor|smell/i, "Smoke- or pet-free home?"],
  ["dimensions", /size|dimensions?|how (big|tall|wide)|measure/i, "What are the dimensions?"],
  ["color", /colou?r/i, "What color is it?"],
  ["model", /model|brand|make|which (one|version)|specs?/i, "What is the exact brand and model?"],
  ["pages", /pages?|highlight|notes in|markings?|torn/i, "Any highlighting, notes, or torn pages?"],
];

export function topicsFor(text: string): string[] {
  return TOPICS.filter(([, re]) => re.test(text)).map(([t]) => t);
}

export function questionForTopic(topic: string, fallback: string) {
  return TOPICS.find(([t]) => t === topic)?.[2] ?? fallback;
}

const STOP = new Set(
  "the a an is it this that does do are there any you your have has of to for in on and or with what how can i me my be".split(" "),
);
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

export function findFact(product: Product, question: string): Fact | null {
  const topics = topicsFor(question);
  const byTopic = product.facts.find((f) => topics.includes(f.topic));
  if (byTopic) return byTopic;
  const q = new Set(words(question));
  let best: { f: Fact; score: number } | null = null;
  for (const f of product.facts) {
    const score = words(`${f.topic} ${f.question}`).filter((w) => q.has(w)).length;
    if (score >= 2 && (!best || score > best.score)) best = { f, score };
  }
  return best?.f ?? null;
}

/**
 * Some questions are answered by the reviewed product record itself
 * (condition, brand/model, attributes) rather than a separate fact.
 */
export function answerFromRecord(product: Product, question: string): string | null {
  const topics = topicsFor(question);
  if (topics.includes("model") && product.brand && product.model)
    return `It's a ${product.brand} ${product.model}.`;
  if (topics.includes("model") && product.brand) return `The brand is ${product.brand}; the exact model isn't confirmed.`;
  for (const a of product.attributes) {
    if (new RegExp(`\\b${a.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(question))
      return `${a.name}: ${a.value}.`;
  }
  if (/condition|shape|how (is|does) it (look|work)/i.test(question) && topics.length === 0)
    return `The seller describes it as ${product.condition.toLowerCase()} condition.`;
  return null;
}

/** The single knowledge context handed to the agent (and to Claude when enabled). */
export function knowledgeSheet(product: Product) {
  return {
    title: product.title,
    category: product.category,
    condition: product.condition,
    brand: product.brand || null,
    model: product.model || null,
    attributes: product.attributes,
    verifiedFacts: product.facts.map((f) => ({
      question: f.question,
      answer: f.answer,
      source: f.source,
      hasEvidence: f.evidenceIds.length > 0,
    })),
    description: product.description,
  };
}
