import { errorResponse, olx, OlxError } from "@/lib/server/olx";

/** Buyer messages: GET /threads/{id}/messages */
export async function GET(_req: Request, ctx: RouteContext<"/api/olx/threads/[id]/messages">) {
  try {
    const { id } = await ctx.params;
    const r = await olx<{ data: unknown[] }>("GET", `/threads/${encodeURIComponent(id)}/messages`);
    return Response.json(r.data);
  } catch (e) {
    return errorResponse(e);
  }
}

/** Send a seller-authorized message: POST /threads/{id}/messages */
export async function POST(req: Request, ctx: RouteContext<"/api/olx/threads/[id]/messages">) {
  try {
    const { id } = await ctx.params;
    const { text } = (await req.json()) as { text?: string };
    if (!text?.trim()) throw new OlxError("Message is empty.", 400);
    const r = await olx<{ data: unknown }>("POST", `/threads/${encodeURIComponent(id)}/messages`, { text });
    return Response.json(r.data ?? { ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
