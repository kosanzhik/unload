import crypto from "node:crypto";
import { cookies } from "next/headers";
import { authorizeUrl, olxConfigured } from "@/lib/server/olx";

/** Starts the official OLX OAuth authorization-code flow. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!olxConfigured()) return Response.redirect(`${origin}/marketplaces?olx=not_configured`, 302);
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("unload_olx_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return Response.redirect(authorizeUrl(`${origin}/api/olx/callback`, state), 302);
}
