import { CONDITION, ebay, EbayError, errorResponse } from "@/lib/server/ebay";

type Body = {
  sku: string;
  title: string;
  description: string;
  condition: string;
  brand?: string;
  aspects: Record<string, string[]>;
  imageUrls: string[];
  price: number;
  categoryQuery: string;
  location: { city: string; stateOrProvince: string; postalCode: string; country: string };
};

/**
 * Publish an approved listing (Inventory API):
 * inventory item → merchant location → business policies → category → offer → publish.
 */
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;
    if (!b.imageUrls.length) throw new EbayError("eBay requires at least one public photo URL.", 422);

    await ebay("PUT", `/sell/inventory/v1/inventory_item/${encodeURIComponent(b.sku)}`, {
      availability: { shipToLocationAvailability: { quantity: 1 } },
      condition: CONDITION[b.condition] ?? "USED_GOOD",
      product: {
        title: b.title.slice(0, 80),
        description: b.description,
        imageUrls: b.imageUrls.slice(0, 24),
        aspects: { ...b.aspects, ...(b.brand ? { Brand: [b.brand] } : {}) },
        ...(b.brand ? { brand: b.brand } : {}),
      },
    });

    const locationKey = "unload-default";
    try {
      await ebay("GET", `/sell/inventory/v1/location/${locationKey}`);
    } catch (e) {
      if (!(e instanceof EbayError) || e.status !== 404) throw e;
      await ebay("POST", `/sell/inventory/v1/location/${locationKey}`, {
        location: { address: b.location },
        locationTypes: ["WAREHOUSE"],
        name: "UNLOAD seller location",
        merchantLocationStatus: "ENABLED",
      });
    }

    const [f, p, r] = await Promise.all([
      ebay<{ fulfillmentPolicies?: { fulfillmentPolicyId: string }[] }>("GET", "/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US"),
      ebay<{ paymentPolicies?: { paymentPolicyId: string }[] }>("GET", "/sell/account/v1/payment_policy?marketplace_id=EBAY_US"),
      ebay<{ returnPolicies?: { returnPolicyId: string }[] }>("GET", "/sell/account/v1/return_policy?marketplace_id=EBAY_US"),
    ]);
    const policies = {
      fulfillmentPolicyId: f.fulfillmentPolicies?.[0]?.fulfillmentPolicyId,
      paymentPolicyId: p.paymentPolicies?.[0]?.paymentPolicyId,
      returnPolicyId: r.returnPolicies?.[0]?.returnPolicyId,
    };
    if (!policies.fulfillmentPolicyId || !policies.paymentPolicyId || !policies.returnPolicyId)
      throw new EbayError("Your eBay account needs shipping, payment and return business policies. Create them in eBay Seller Hub → Business policies, then publish again.", 422);

    const tree = await ebay<{ categoryTreeId: string }>("GET", "/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=EBAY_US");
    const sug = await ebay<{ categorySuggestions?: { category: { categoryId: string } }[] }>(
      "GET",
      `/commerce/taxonomy/v1/category_tree/${tree.categoryTreeId}/get_category_suggestions?q=${encodeURIComponent(b.categoryQuery)}`,
    );
    // Note: eBay's Sandbox returns placeholder suggestions; categories are only meaningful in production.
    const categoryId = sug.categorySuggestions?.[0]?.category.categoryId;
    if (!categoryId) throw new EbayError("eBay couldn't suggest a category for this title. Edit the title and try again.", 422);

    const offer = await ebay<{ offerId: string }>("POST", "/sell/inventory/v1/offer", {
      sku: b.sku,
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId,
      listingDescription: b.description,
      listingPolicies: policies,
      merchantLocationKey: locationKey,
      pricingSummary: { price: { value: b.price.toFixed(2), currency: "USD" } },
    });
    const pub = await ebay<{ listingId: string }>("POST", `/sell/inventory/v1/offer/${offer.offerId}/publish`);
    return Response.json({ offerId: offer.offerId, listingId: pub.listingId });
  } catch (e) {
    return errorResponse(e);
  }
}
