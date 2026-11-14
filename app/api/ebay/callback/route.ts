import { cookies } from "next/headers";
import { EbayError, exchangeCode, writeTokens } from "@/lib/server/ebay";

/** Set this URL as the "auth accepted URL" of your eBay RuName. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => Response.redirect(`${url.origin}/marketplaces?ebay=${q}`, 302);
  const jar = await cookies();
  const expected = jar.get("unload_ebay_state")?.value;
  jar.delete("unload_ebay_state");
  const code = url.searchParams.get("code");
  if (!code) return back("denied");
  if (!expected || url.searchParams.get("state") !== expected) return back("invalid_state");
  try {
    await writeTokens(await exchangeCode(code));
    return back("connected");
  } catch (e) {
    return back(e instanceof EbayError ? `error&message=${encodeURIComponent(e.message)}` : "error");
  }
}
