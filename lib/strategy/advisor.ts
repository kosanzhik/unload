import type { Conversation, DealRequest, IntegrationState, Listing, MarketplaceId, Product } from "../core/types";

/**
 * AI Sales Strategy — rule-based recommendations.
 * "measured" items come from this account's own data (views, chats, offers).
 * "heuristic" items are rules of thumb and are labeled as such. Nothing here
 * predicts demand, sale probability, or time to sell.
 */

export type Advice = {
  id: string;
  kind: "measured" | "heuristic";
  title: string;
  body: string;
  action?: { label: string; href: string };
};

const DAY = 86_400_000;

export function adviseProduct(
  p: Product,
  listings: Listing[],
  convos: Conversation[],
  deals: DealRequest[],
  integrations: Partial<Record<MarketplaceId, IntegrationState>>,
): Advice[] {
  if (p.status === "sold" || p.status === "archived") return [];
  const out: Advice[] = [];
  const live = listings.filter((l) => l.status === "active" || l.status === "moderation" || l.status === "exported");
  const href = `/products/${p.id}`;

  // Marketplace choice: based on what is actually connected and the pricing currency.
  if (!live.length) {
    if (p.pricing.currency === "KZT")
      out.push({
        id: "mk-olx",
        kind: "heuristic",
        title: "Use OLX for a KZT-priced item",
        body:
          integrations.olx === "connected"
            ? "OLX Kazakhstan is connected and matches your currency, so the agent can publish there and read buyer messages."
            : "OLX Kazakhstan matches your currency. Until its API access is connected, export the draft and post it manually.",
        action: { label: integrations.olx === "connected" ? "Publish" : "Open marketplaces", href: integrations.olx === "connected" ? href : "/marketplaces" },
      });
    else
      out.push({
        id: "mk-usd",
        kind: "heuristic",
        title: "Post where your buyers already are",
        body: "For a USD-priced item, eBay, Facebook Marketplace, or Mercari fit. They need manual posting in this version, but the agent still prepares each draft.",
        action: { label: "Open marketplaces", href: "/marketplaces" },
      });
  }

  if (p.photos.length < 3)
    out.push({
      id: "photos",
      kind: "heuristic",
      title: "Add more photos",
      body: `This listing has ${p.photos.length} photo${p.photos.length === 1 ? "" : "s"}. Front, back, labels, and any wear usually answer questions before buyers ask.`,
      action: { label: "Add photos", href: `${href}#photos` },
    });

  if (!p.brand || !p.model)
    out.push({
      id: "model",
      kind: "heuristic",
      title: "Confirm the brand and model",
      body: "Buyers search by model name, and the agent can't answer spec questions without it.",
      action: { label: "Edit details", href: `${href}#details` },
    });

  const unanswered = p.sellerQuestions.filter((q) => !q.answer?.trim());
  if (unanswered.length)
    out.push({
      id: "questions",
      kind: "heuristic",
      title: `${unanswered.length} seller question${unanswered.length > 1 ? "s" : ""} unanswered`,
      body: "Answering them now becomes verified knowledge, so the agent can reply instantly instead of escalating to you.",
      action: { label: "Answer", href: `${href}#knowledge` },
    });

  if (p.pricing.desired == null)
    out.push({ id: "price", kind: "heuristic", title: "Set an asking price", body: "The agent won't discuss price until you set one.", action: { label: "Set price", href: `${href}#pricing` } });
  else if (!p.pricing.negotiationEnabled)
    out.push({
      id: "neg",
      kind: "heuristic",
      title: "Counteroffers are off",
      body: "The agent will only restate your asking price. Turn on negotiation with a private minimum if you want it to counter lowball offers for you.",
      action: { label: "Pricing rules", href: `${href}#pricing` },
    });

  // Measured signals from this account's own data.
  const firstLive = live.map((l) => l.publishedAt ?? 0).filter(Boolean).sort()[0];
  const chats = convos.filter((c) => c.productId === p.id);
  const views = listings.reduce((s, l) => s + (l.views ?? 0), 0);
  if (firstLive) {
    const dealCount = deals.filter((d) => d.productId === p.id).length;
    const days = Math.max(0, Math.floor((Date.now() - firstLive) / DAY));
    out.push({
      id: "measured-activity",
      kind: "measured",
      title: "Activity so far",
      body: `Listed ${days === 0 ? "today" : `${days} day${days > 1 ? "s" : ""} ago`} · ${views} view${views === 1 ? "" : "s"} reported by connected marketplaces · ${chats.length} conversation${chats.length === 1 ? "" : "s"} · ${dealCount} deal request${dealCount === 1 ? "" : "s"}.`,
    });
    if (days >= 3 && chats.length === 0)
      out.push({
        id: "low-interest",
        kind: "heuristic",
        title: "Little interest after 3+ days",
        body: "Common fixes: a clearer first photo, the model name in the title, or a lower asking price you're comfortable with. UNLOAD can't predict how much any change will help.",
        action: { label: "Edit listing", href: `${href}#details` },
      });
  }
  const lowOffers = chats.reduce((s, c) => s + c.lowOfferCount, 0);
  if (lowOffers >= 2)
    out.push({
      id: "measured-offers",
      kind: "measured",
      title: `${lowOffers} offers below your approved range`,
      body: "Multiple buyers offered less than your range. Keep your price, or review your minimum if you're open to it — your call.",
      action: { label: "Pricing rules", href: `${href}#pricing` },
    });

  return out;
}

/** Bundle suggestions across the seller's unsold items (same category, both in decent shape). */
export function bundleSuggestions(products: Product[]): Advice[] {
  const open = products.filter((p) => p.status !== "sold" && p.status !== "archived");
  const byCat = new Map<string, Product[]>();
  for (const p of open) if (p.condition !== "For parts") byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
  return [...byCat.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([cat, list]) => ({
      id: `bundle-${cat}`,
      kind: "heuristic" as const,
      title: `Bundle ${list.length} ${cat.toLowerCase()} items?`,
      body: `${list.map((p) => p.title).join(" + ")}. One listing means less to manage; separate listings let you price each item. Your call.`,
    }));
}
