import { challengeResponse } from "@/lib/server/ebay";

/**
 * eBay Marketplace Account Deletion endpoint (required to activate a production keyset).
 * UNLOAD stores no eBay user data on its servers (tokens live only in the user's own
 * encrypted cookie), so a deletion notification needs no further action — we acknowledge it.
 */
const ENDPOINT = process.env.EBAY_DELETION_ENDPOINT ?? "https://unload-tau.vercel.app/api/ebay/account-deletion";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("challenge_code");
  if (!code || !process.env.EBAY_VERIFICATION_TOKEN) return Response.json({ error: "Missing challenge_code or token" }, { status: 400 });
  return Response.json({ challengeResponse: challengeResponse(code, ENDPOINT) });
}

export async function POST() {
  return new Response(null, { status: 204 });
}
