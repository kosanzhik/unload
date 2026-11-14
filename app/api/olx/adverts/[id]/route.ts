import { errorResponse, olx } from "@/lib/server/olx";

/** Read listing status: GET /adverts/{id} */
export async function GET(_req: Request, ctx: RouteContext<"/api/olx/adverts/[id]">) {
  try {
    const { id } = await ctx.params;
    const r = await olx<{ data: unknown }>("GET", `/adverts/${encodeURIComponent(id)}`);
    return Response.json(r.data);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Update listing information: PUT /adverts/{id} (OLX expects the full advert body). */
export async function PUT(req: Request, ctx: RouteContext<"/api/olx/adverts/[id]">) {
  try {
    const { id } = await ctx.params;
    const patch = (await req.json()) as { title?: string; description?: string; price?: number | null };
    const current = await olx<{ data: Record<string, unknown> & { price?: Record<string, unknown> } }>(
      "GET",
      `/adverts/${encodeURIComponent(id)}`,
    );
    const a = current.data;
    const body = {
      title: patch.title ?? a.title,
      description: patch.description ?? a.description,
      category_id: a.category_id,
      advertiser_type: a.advertiser_type,
      external_id: a.external_id,
      contact: a.contact,
      location: a.location,
      images: a.images,
      attributes: a.attributes,
      price: patch.price != null && a.price ? { ...a.price, value: Math.round(patch.price) } : a.price,
    };
    const r = await olx<{ data: unknown }>("PUT", `/adverts/${encodeURIComponent(id)}`, body);
    return Response.json(r.data);
  } catch (e) {
    return errorResponse(e);
  }
}
