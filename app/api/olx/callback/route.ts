import { cookies } from "next/headers";
import { exchangeToken, olx, OlxError, writeTokens } from "@/lib/server/olx";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => Response.redirect(`${url.origin}/marketplaces?olx=${q}`, 302);
  const jar = await cookies();
  const expected = jar.get("unload_olx_state")?.value;
  jar.delete("unload_olx_state");
  if (url.searchParams.get("error")) return back("denied");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return back("invalid_state");
  try {
    const t = await exchangeToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${url.origin}/api/olx/callback`,
    });
    await writeTokens(t);
    const me = await olx<{ data?: { name?: string; email?: string } }>("GET", "/users/me").catch(() => null);
    await writeTokens({ ...t, account: me?.data?.name ?? me?.data?.email });
    return back("connected");
  } catch (e) {
    return back(e instanceof OlxError ? `error&message=${encodeURIComponent(e.message)}` : "error");
  }
}
