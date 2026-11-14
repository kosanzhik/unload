import { connection } from "next/server";
import { errorResponse, listingIdFrom, reverb } from "@/lib/server/reverb";

type Conv = Record<string, unknown> & { id: number | string; unread?: boolean; updated_at?: string; created_at?: string };

/** Buyer conversations: GET /my/conversations */
export async function GET() {
  await connection();
  try {
    const r = await reverb<{ conversations?: Conv[] }>("GET", "/my/conversations");
    return Response.json(
      (r.conversations ?? []).map((c) => ({
        id: String(c.id),
        listingId: listingIdFrom(c.listing ?? c._links ?? c),
        buyer: String((c.other_user as { name?: string } | undefined)?.name ?? (c.buyer as { name?: string } | undefined)?.name ?? "Reverb buyer"),
        unread: Boolean(c.unread),
        updatedAt: c.updated_at ?? c.created_at ?? null,
      })),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
