import { ebay, errorResponse } from "@/lib/server/ebay";

/** Listing status: GET /offer/{offerId} */
export async function GET(_req: Request, ctx: RouteContext<"/api/ebay/offers/[id]">) {
  try {
    const { id } = await ctx.params;
    const o = await ebay<{ status: string; listing?: { listingId?: string; listingStatus?: string } }>("GET", `/sell/inventory/v1/offer/${encodeURIComponent(id)}`);
    return Response.json({ status: o.status, listingId: o.listing?.listingId, listingStatus: o.listing?.listingStatus });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Update price/description: GET + PUT /offer/{offerId} (updateOffer replaces the offer). */
export async function PUT(req: Request, ctx: RouteContext<"/api/ebay/offers/[id]">) {
  try {
    const { id } = await ctx.params;
    const patch = (await req.json()) as { description?: string; price?: number | null };
    const o = await ebay<Record<string, unknown>>("GET", `/sell/inventory/v1/offer/${encodeURIComponent(id)}`);
    // updateOffer replaces the whole offer, so resend the editable fields we keep.
    const keep = ["availableQuantity", "categoryId", "listingDescription", "listingPolicies", "merchantLocationKey", "pricingSummary", "listingDuration"];
    const body: Record<string, unknown> = Object.fromEntries(keep.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
    if (patch.description) body.listingDescription = patch.description;
    if (patch.price != null) body.pricingSummary = { price: { value: patch.price.toFixed(2), currency: "USD" } };
    await ebay("PUT", `/sell/inventory/v1/offer/${encodeURIComponent(id)}`, body);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
