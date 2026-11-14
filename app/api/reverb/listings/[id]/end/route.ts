import { errorResponse, reverb } from "@/lib/server/reverb";

/**
 * End a live listing: PUT /my/listings/{id}/state/end.
 * reason "reverb_sale" when the buyer came from Reverb (Reverb then bills its selling fee),
 * "not_sold" otherwise.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/reverb/listings/[id]/end">) {
  try {
    const { id } = await ctx.params;
    const { soldOnReverb } = (await req.json().catch(() => ({}))) as { soldOnReverb?: boolean };
    await reverb("PUT", `/my/listings/${encodeURIComponent(id)}/state/end`, { reason: soldOnReverb ? "reverb_sale" : "not_sold" });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
