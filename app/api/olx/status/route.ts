import { connection } from "next/server";
import { olxConfigured, readTokens } from "@/lib/server/olx";

export async function GET() {
  await connection();
  if (!olxConfigured()) return Response.json({ configured: false, connected: false });
  const t = await readTokens();
  return Response.json({ configured: true, connected: Boolean(t), account: t?.account ?? null });
}
