import { clearTokens } from "@/lib/server/olx";

export async function POST() {
  await clearTokens();
  return Response.json({ ok: true });
}
