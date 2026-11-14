import { connection } from "next/server";
import { readSession, reverb } from "@/lib/server/reverb";

/**
 * Integration self-check for the connected seller. Returns only counts and
 * field NAMES from Reverb responses — no message text, names or tokens —
 * so it can be shared safely when debugging.
 */
export async function GET() {
  await connection();
  const s = await readSession().catch(() => null);
  if (!s) return Response.json({ connected: false, hint: "Paste your token on /marketplaces first." });

  const step = async <T,>(name: string, fn: () => Promise<T>) => {
    try {
      return { ok: true as const, ...(await fn()) };
    } catch (e) {
      return { ok: false as const, error: `${name}: ${e instanceof Error ? e.message : "failed"}` };
    }
  };
  const keys = (o: unknown) => (o && typeof o === "object" ? Object.keys(o as object).sort() : []);

  const shop = await step("shop", async () => {
    const r = await reverb<{ shipping_profiles?: unknown[] }>("GET", "/shop");
    return { shippingProfiles: r.shipping_profiles?.length ?? 0 };
  });
  const listings = await step("listings", async () => {
    const r = await reverb<{ total?: number; listings?: unknown[] }>("GET", "/my/listings?state=all&per_page=5");
    return { total: r.total ?? r.listings?.length ?? 0, listingKeys: keys(r.listings?.[0]) };
  });
  const account = await step("account", async () => ({ accountKeys: keys(await reverb("GET", "/my/account")) }));
  const conversations = await step("conversations", async () => {
    const r = await reverb<{ conversations?: { id: number | string }[] }>("GET", "/my/conversations");
    const first = r.conversations?.[0];
    let messageKeys: string[] = [];
    let conversationDetailKeys: string[] = [];
    if (first) {
      const c = await reverb<{ messages?: unknown[] }>("GET", `/my/conversations/${first.id}`);
      conversationDetailKeys = keys(c);
      messageKeys = keys(c.messages?.[0]);
    }
    return {
      count: r.conversations?.length ?? 0,
      conversationKeys: keys(first),
      hasListingLink: first ? /\/listings\/\d+/.test(JSON.stringify(first)) : null,
      conversationDetailKeys,
      messageKeys,
    };
  });

  return Response.json({ connected: true, env: s.env, shop, listings, account, conversations });
}
