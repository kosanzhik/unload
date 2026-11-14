import { errorResponse, olx, OlxError } from "@/lib/server/olx";

type Body = {
  title: string;
  description: string;
  price: number | null;
  negotiable: boolean;
  categoryQuery: string;
  city: string;
  contactName: string;
  phone?: string;
  imageUrls: string[];
  externalId: string;
};

/**
 * Publishes an approved listing: POST /adverts.
 * Category comes from OLX's own suggestion endpoint; the city from OLX's city list.
 */
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;
    const sug = await olx<{ data: { id: number }[] }>(
      "GET",
      `/categories/suggestion?q=${encodeURIComponent(b.categoryQuery || b.title)}`,
    );
    const categoryId = sug.data?.[0]?.id;
    if (!categoryId) throw new OlxError("OLX couldn't suggest a category for this title. Edit the title and try again.", 422);

    const cityId = await findCity(b.city);
    if (!cityId) throw new OlxError(`City “${b.city}” wasn't found in OLX's city list. Check the city in Autopilot Settings.`, 422);

    const advert = await olx<{ data: { id: number; status: string; url?: string } }>("POST", "/adverts", {
      title: b.title,
      description: b.description,
      category_id: categoryId,
      advertiser_type: "private",
      external_id: b.externalId,
      contact: { name: b.contactName || "Seller", ...(b.phone ? { phone: b.phone } : {}) },
      location: { city_id: cityId },
      images: b.imageUrls.slice(0, 8).map((url) => ({ url })),
      ...(b.price != null
        ? { price: { value: Math.round(b.price), currency: "KZT", negotiable: b.negotiable, trade: false } }
        : {}),
    });
    return Response.json(advert.data);
  } catch (e) {
    return errorResponse(e);
  }
}

async function findCity(name: string): Promise<number | null> {
  const want = name.trim().toLowerCase().replace("ё", "е");
  if (!want) return null;
  for (let offset = 0; offset < 10000; offset += 1000) {
    const page = await olx<{ data: { id: number; name: string }[] }>("GET", `/cities?offset=${offset}&limit=1000`);
    const hit = page.data.find((c) => c.name.toLowerCase().replace("ё", "е") === want);
    if (hit) return hit.id;
    if (page.data.length < 1000) break;
  }
  return null;
}
