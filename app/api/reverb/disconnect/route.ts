import { clearSession } from "@/lib/server/reverb";

export async function POST() {
  await clearSession();
  return Response.json({ ok: true });
}
