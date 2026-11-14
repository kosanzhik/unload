import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Reverb API client (server only). Docs: https://www.reverb-api.com/docs
 *  - Auth: seller's Personal Access Token (My Profile → API & Integrations), never expires.
 *  - Headers: Authorization: Bearer, Accept-Version: 3.0, Content-Type/Accept: application/hal+json.
 *  - Production api.reverb.com/api · Sandbox sandbox.reverb.com/api (same endpoints).
 * The token is kept in an encrypted httpOnly cookie on the seller's own browser.
 */

const COOKIE = "unload_reverb";
const HOSTS = { production: "https://api.reverb.com/api", sandbox: "https://sandbox.reverb.com/api" } as const;
export type ReverbEnv = keyof typeof HOSTS;

type Session = { token: string; env: ReverbEnv; account?: string };

export class ReverbError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function key() {
  const secret = process.env.UNLOAD_COOKIE_SECRET;
  if (!secret) throw new ReverbError("Server is missing UNLOAD_COOKIE_SECRET.", 500);
  return crypto.createHash("sha256").update(`unload-reverb:${secret}`).digest();
}
function seal(t: Session) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(t), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}
function unseal(v: string): Session | null {
  try {
    const b = Buffer.from(v, "base64url");
    const d = crypto.createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

export async function readSession() {
  const v = (await cookies()).get(COOKIE)?.value;
  return v ? unseal(v) : null;
}
export async function writeSession(s: Session) {
  (await cookies()).set(COOKIE, seal(s), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

async function call<T>(s: Pick<Session, "token" | "env">, method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${HOSTS[s.env]}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${s.token}`,
      "Accept-Version": "3.0",
      Accept: "application/hal+json",
      "Content-Type": "application/hal+json",
      "User-Agent": "UNLOAD-Autopilot/1.0 (+https://unload-tau.vercel.app)",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (r.status === 204) return {} as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const errs = j.errors && typeof j.errors === "object" ? Object.entries(j.errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`) : [];
    const msg = errs.join("; ") || j.message || (r.status === 401 ? "Reverb rejected the token." : `Reverb API error (HTTP ${r.status})`);
    throw new ReverbError(msg, r.status);
  }
  return j as T;
}

/** Validate a pasted token and remember it. */
export async function connectToken(token: string, env: ReverbEnv) {
  const s = { token: token.trim(), env };
  await call(s, "GET", "/my/listings?state=all&per_page=1");
  const shop = await call<{ name?: string }>(s, "GET", "/shop").catch(() => null);
  await writeSession({ ...s, account: shop?.name });
  return shop?.name ?? null;
}

export async function reverb<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const s = await readSession();
  if (!s) throw new ReverbError("Reverb account is not connected.", 401);
  return call<T>(s, method, path, body);
}

export function errorResponse(e: unknown) {
  if (e instanceof ReverbError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Unexpected error talking to Reverb." }, { status: 502 });
}

/** UNLOAD condition → Reverb listing condition UUIDs (from Reverb's Create Listings docs). */
export const CONDITION_UUID: Record<string, string> = {
  New: "7c3f45de-2ae0-4c81-8400-fdb6b1d74890", // Brand New
  "Like new": "df268ad1-c462-4ba6-b6db-e007e23922ea", // Excellent (Mint needs special shop permission)
  Good: "f7a3f48c-972a-44c6-b01a-0cd27488d3f6", // Good
  Fair: "98777886-76d0-44c8-865e-bb40e669e934", // Fair
  "For parts": "fbf35668-96a0-4baa-bcde-ab18d6b1b329", // Non functioning
};

/** Pick the best listable Reverb category for a title (public endpoint, cached per instance). */
let cats: { uuid: string; full_name: string; listable: boolean }[] | null = null;
export async function suggestCategory(text: string) {
  if (!cats) {
    // Authenticated: Reverb's CDN blocks anonymous server-side requests.
    const r = await reverb<{ categories?: typeof cats }>("GET", "/categories/flat");
    cats = r.categories ?? [];
  }
  const norm = (w: string) =>
    w
      .replace(/^synthesi[sz]er$/, "synth")
      .replace(/^mic$/, "microphone")
      .replace(/(ies)$/, "y")
      .replace(/s$/, "");
  const tokens = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2).map(norm);
  const words = new Set(tokens(text));
  let best: { uuid: string; name: string; score: number } | null = null;
  for (const c of cats!) {
    if (!c.listable) continue;
    const parts = c.full_name.split(" / ");
    const leaf = new Set(tokens(parts[parts.length - 1]));
    const path = new Set(tokens(c.full_name));
    let leafHits = 0;
    let score = 0;
    for (const w of words) {
      if (leaf.has(w)) (leafHits++, (score += 3));
      else if (path.has(w)) score += 1;
    }
    if (!leafHits) continue;
    if (/accessor|parts|pedals/i.test(c.full_name) && !/accessor|part|pedal|case|cable|stand/i.test(text)) score -= 2;
    if (score > 0 && (!best || score > best.score || (score === best.score && c.full_name.length < best.name.length)))
      best = { uuid: c.uuid, name: c.full_name, score };
  }
  return best && best.score >= 3 ? best : null;
}

/** Listing id from a Reverb object or link (`.../listings/123-slug`). */
export function listingIdFrom(x: unknown): string | null {
  const s = JSON.stringify(x ?? "");
  const m = s.match(/\/listings\/(\d+)/);
  return m ? m[1] : null;
}
