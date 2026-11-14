import { errorResponse, reverb, ReverbError } from "@/lib/server/reverb";

type Msg = { id?: number | string; body?: string; created_at?: string; sender_id?: number | string; sender?: { id?: number | string }; _links?: unknown };

/** Messages in chronological order: GET /my/conversations/{id} */
export async function GET(_req: Request, ctx: RouteContext<"/api/reverb/conversations/[id]">) {
  try {
    const { id } = await ctx.params;
    const [c, me] = await Promise.all([
      reverb<{ messages?: Msg[] }>("GET", `/my/conversations/${encodeURIComponent(id)}`),
      reverb<{ user_id?: number | string; id?: number | string }>("GET", "/my/account").catch(() => null),
    ]);
    const myId = String(me?.user_id ?? me?.id ?? "");
    return Response.json(
      (c.messages ?? []).map((m, i) => {
        const sender = String(m.sender_id ?? m.sender?.id ?? "");
        return { id: String(m.id ?? `${id}-${i}`), text: m.body ?? "", createdAt: m.created_at ?? null, fromBuyer: myId ? sender !== myId : true };
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}

/** Reply: POST /my/conversations/{id}/messages */
export async function POST(req: Request, ctx: RouteContext<"/api/reverb/conversations/[id]">) {
  try {
    const { id } = await ctx.params;
    const { text } = (await req.json()) as { text?: string };
    if (!text?.trim()) throw new ReverbError("Message is empty.", 400);
    await reverb("POST", `/my/conversations/${encodeURIComponent(id)}/messages`, { body: text });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
