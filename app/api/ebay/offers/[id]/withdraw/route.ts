import { ebay, errorResponse } from "@/lib/server/ebay";

/** End a listing: POST /offer/{offerId}/withdraw */
export async function POST(_req: Request, ctx: RouteContext<"/api/ebay/offers/[id]/withdraw">) {
  try {
    const { id } = await ctx.params;
    await ebay("POST", `/sell/inventory/v1/offer/${encodeURIComponent(id)}/withdraw`);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
