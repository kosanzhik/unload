import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * eBay Sell APIs client (server only), per the official OpenAPI specs:
 *  - OAuth (authorization code):  https://auth.ebay.com/oauth2/authorize · https://api.ebay.com/identity/v1/oauth2/token
 *  - Inventory API: /sell/inventory/v1  (inventory_item, offer, publish, withdraw, location)
 *  - Account API:   /sell/account/v1    (business policies)
 *  - Taxonomy API:  /commerce/taxonomy/v1 (category suggestions)
 * Env: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RU_NAME (redirect URL name), EBAY_ENV=sandbox|production.
 */

const SANDBOX = process.env.EBAY_ENV !== "production";
export const EBAY_API = SANDBOX ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
const EBAY_AUTH = SANDBOX ? "https://auth.sandbox.ebay.com" : "https://auth.ebay.com";
export const EBAY_ENV = SANDBOX ? "sandbox" : "production";
const COOKIE = "unload_ebay";

const SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
];

export function ebayConfigured() {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET && process.env.EBAY_RU_NAME);
}

export class EbayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type Tokens = { access_token: string; refresh_token?: string; expires_at: number };

function key() {
  return crypto.createHash("sha256").update(`unload-ebay:${process.env.EBAY_CLIENT_SECRET ?? ""}`).digest();
}
function seal(t: Tokens) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(t), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}
function unseal(v: string): Tokens | null {
  try {
    const b = Buffer.from(v, "base64url");
    const d = crypto.createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

export async function readTokens() {
  const v = (await cookies()).get(COOKIE)?.value;
  return v ? unseal(v) : null;
}
export async function writeTokens(t: Tokens) {
  (await cookies()).set(COOKIE, seal(t), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function clearTokens() {
  (await cookies()).delete(COOKIE);
}

export function authorizeUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.EBAY_CLIENT_ID!,
    redirect_uri: process.env.EBAY_RU_NAME!, // eBay expects the RuName here, not a URL
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
  });
  return `${EBAY_AUTH}/oauth2/authorize?${q}`;
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens & { refresh_token?: string }> {
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
  const r = await fetch(`${EBAY_API}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new EbayError(j.error_description ?? j.error ?? `eBay token error (HTTP ${r.status})`, r.status);
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (Number(j.expires_in) || 7200) * 1000 };
}

export function exchangeCode(code: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: process.env.EBAY_RU_NAME! });
}

async function validTokens(): Promise<Tokens> {
  const t = await readTokens();
  if (!t) throw new EbayError("eBay account is not connected.", 401);
  if (t.expires_at - 60_000 > Date.now()) return t;
  if (!t.refresh_token) throw new EbayError("eBay authorization expired. Connect the account again.", 401);
  const fresh = await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token, scope: SCOPES.join(" ") });
  const next = { ...fresh, refresh_token: t.refresh_token };
  await writeTokens(next);
  return next;
}

/** Authenticated call on behalf of the connected seller. */
export async function ebay<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const t = await validTokens();
  const r = await fetch(`${EBAY_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${t.access_token}`,
      Accept: "application/json",
      "Content-Language": "en-US",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (r.status === 204) return {} as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.errors ?? []).map((e: { message?: string; longMessage?: string }) => e.longMessage ?? e.message).filter(Boolean).join("; ");
    throw new EbayError(msg || `eBay API error (HTTP ${r.status})`, r.status);
  }
  return j as T;
}

export function errorResponse(e: unknown) {
  if (e instanceof EbayError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Unexpected error talking to eBay." }, { status: 502 });
}

/** UNLOAD condition → eBay ConditionEnum (Inventory API). */
export const CONDITION: Record<string, string> = {
  New: "NEW",
  "Like new": "LIKE_NEW",
  Good: "USED_GOOD",
  Fair: "USED_ACCEPTABLE",
  "For parts": "FOR_PARTS_OR_NOT_WORKING",
};

/** Marketplace account deletion challenge (required for production keysets). */
export function challengeResponse(challengeCode: string, endpoint: string) {
  return crypto
    .createHash("sha256")
    .update(challengeCode)
    .update(process.env.EBAY_VERIFICATION_TOKEN ?? "")
    .update(endpoint)
    .digest("hex");
}
