import { errorResponse, reverb } from "@/lib/server/reverb";

/** Listing status: GET /listings/{id} */
export async function GET(_req: Request, ctx: RouteContext<"/api/reverb/listings/[id]">) {
  try {
    const { id } = await ctx.params;
    const L = await reverb<{ state?: { slug?: string }; _links?: { web?: { href?: string } }; stats?: { views?: number } }>(
      "GET",
      `/listings/${encodeURIComponent(id)}`,
    );
    return Response.json({ state: L.state?.slug ?? null, url: L._links?.web?.href ?? null, views: L.stats?.views ?? null });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Update a listing: PUT /listings/{id} (same fields as create). */
export async function PUT(req: Request, ctx: RouteContext<"/api/reverb/listings/[id]">) {
  try {
    const { id } = await ctx.params;
    const p = (await req.json()) as { title?: string; description?: string; price?: number | null; publish?: boolean };
    await reverb("PUT", `/listings/${encodeURIComponent(id)}`, {
      ...(p.title ? { title: p.title } : {}),
      ...(p.description ? { description: p.description } : {}),
      ...(p.price != null ? { price: { amount: p.price.toFixed(2), currency: "USD" } } : {}),
      ...(p.publish ? { publish: true } : {}),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
