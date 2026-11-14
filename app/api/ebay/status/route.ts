import { connection } from "next/server";
import { EBAY_ENV, ebayConfigured, readTokens } from "@/lib/server/ebay";

export async function GET() {
  await connection();
  if (!ebayConfigured()) return Response.json({ configured: false, connected: false, env: EBAY_ENV });
  return Response.json({ configured: true, connected: Boolean(await readTokens()), env: EBAY_ENV });
}
