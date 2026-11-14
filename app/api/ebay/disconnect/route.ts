import { clearTokens } from "@/lib/server/ebay";

export async function POST() {
  await clearTokens();
  return Response.json({ ok: true });
}
