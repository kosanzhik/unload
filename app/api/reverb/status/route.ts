import { connection } from "next/server";
import { readSession } from "@/lib/server/reverb";

export async function GET() {
  await connection();
  const s = await readSession().catch(() => null);
  return Response.json({ connected: Boolean(s), env: s?.env ?? null, account: s?.account ?? null });
}
