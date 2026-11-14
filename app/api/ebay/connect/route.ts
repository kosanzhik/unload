import crypto from "node:crypto";
import { cookies } from "next/headers";
import { authorizeUrl, ebayConfigured } from "@/lib/server/ebay";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!ebayConfigured()) return Response.redirect(`${origin}/marketplaces?ebay=not_configured`, 302);
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("unload_ebay_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return Response.redirect(authorizeUrl(state), 302);
}
