import type { MarketplaceId, Product } from "../core/types";
import { money } from "../negotiation/policy";

/**
 * Marketplace-specific listing text, built only from seller-reviewed data
 * and verified facts the seller allowed in the listing.
 */

const LIMITS: Record<MarketplaceId, { title: number; description: number }> = {
  mock: { title: 80, description: 5000 },
  olx: { title: 70, description: 9000 },
  ebay: { title: 80, description: 4000 },
  reverb: { title: 120, description: 5000 },
  facebook: { title: 100, description: 5000 },
  mercari: { title: 80, description: 1000 },
};

const clip = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

export function listingTitle(p: Product, m: MarketplaceId) {
  const base = [p.brand, p.model].filter(Boolean).join(" ");
  const title = base && !p.title.toLowerCase().includes(base.toLowerCase()) ? `${base} ${p.title}` : p.title;
  return clip(title, LIMITS[m].title);
}

export function listingDescription(p: Product, m: MarketplaceId) {
  const facts = p.facts.filter((f) => f.inListing);
  const attrs = p.attributes.filter((a) => a.value.trim());
  const lines: string[] = [p.description.trim()];

  if (m === "ebay") {
    lines.push("", "Item specifics:", `• Condition: ${p.condition}`);
    if (p.brand) lines.push(`• Brand: ${p.brand}`);
    if (p.model) lines.push(`• Model: ${p.model}`);
    attrs.forEach((a) => lines.push(`• ${a.name}: ${a.value}`));
  } else if (attrs.length || p.brand) {
    lines.push("", `Condition: ${p.condition}`);
    if (p.brand) lines.push(`Brand: ${[p.brand, p.model].filter(Boolean).join(" ")}`);
    attrs.forEach((a) => lines.push(`${a.name}: ${a.value}`));
  } else {
    lines.push("", `Condition: ${p.condition}`);
  }

  if (facts.length) {
    lines.push("", "Checked by the seller:");
    facts.forEach((f) => lines.push(`• ${f.answer}`));
  }
  if (m === "facebook" || m === "mercari") lines.push("", "Message me with any questions.");
  return clip(lines.join("\n"), LIMITS[m].description);
}

export function listingAsText(p: Product, m: MarketplaceId) {
  return [
    listingTitle(p, m),
    "",
    listingDescription(p, m),
    "",
    `Price: ${money(p.pricing.desired, p.pricing.currency)}`,
  ].join("\n");
}
