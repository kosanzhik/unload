import { CONDITION_UUID, errorResponse, reverb, ReverbError, suggestCategory } from "@/lib/server/reverb";

type Body = {
  sku: string;
  title: string;
  description: string;
  make: string;
  model: string;
  condition: string;
  price: number;
  offersEnabled: boolean;
  photos: string[];
  categoryQuery: string;
};

/** Publish an approved listing: POST /listings with publish=true. */
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;
    if (!b.make || !b.model) throw new ReverbError("Reverb needs the brand and model. Add them in Product details first.", 422);
    if (!b.photos.length) throw new ReverbError("Reverb needs at least one photo.", 422);
    if (/^Computers/.test(b.categoryQuery)) throw new ReverbError("Reverb only accepts music and audio gear — computer equipment isn't allowed there.", 422);
    const category = await suggestCategory(`${b.categoryQuery} ${b.title}`);
    if (!category) throw new ReverbError("This doesn't look like music or audio gear, which is all Reverb accepts.", 422);

    const shop = await reverb<{ shipping_profiles?: { id: string | number }[] }>("GET", "/shop");
    const profile = shop.shipping_profiles?.[0]?.id;
    if (!profile) throw new ReverbError("Create a shipping profile in your Reverb shop settings first — Reverb doesn't allow creating one through the API.", 422);

    const r = await reverb<Record<string, unknown>>("POST", "/listings", {
      make: b.make,
      model: b.model,
      title: b.title,
      description: b.description,
      categories: [{ uuid: category.uuid }],
      condition: { uuid: CONDITION_UUID[b.condition] ?? CONDITION_UUID.Good },
      photos: b.photos.slice(0, 25),
      price: { amount: b.price.toFixed(2), currency: "USD" },
      sku: b.sku,
      has_inventory: true,
      inventory: 1,
      offers_enabled: b.offersEnabled,
      shipping_profile_id: profile,
      publish: true,
    });
    const L = (r.listing ?? r) as { id?: number | string; state?: { slug?: string }; _links?: { web?: { href?: string } } };
    return Response.json({ id: String(L.id ?? ""), state: L.state?.slug ?? null, url: L._links?.web?.href ?? null, category: category.name });
  } catch (e) {
    return errorResponse(e);
  }
}
