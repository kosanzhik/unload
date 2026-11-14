import { connection } from "next/server";
import { errorResponse, olx } from "@/lib/server/olx";

/** Conversation threads: GET /threads */
export async function GET(req: Request) {
  await connection();
  try {
    const advert = new URL(req.url).searchParams.get("advert_id");
    const r = await olx<{ data: unknown[] }>("GET", `/threads${advert ? `?advert_id=${encodeURIComponent(advert)}` : ""}`);
    return Response.json(r.data);
  } catch (e) {
    return errorResponse(e);
  }
}
