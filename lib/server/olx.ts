import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * OLX Kazakhstan Partner API v2 client (server only).
 * Docs: https://developer.olx.kz/api/doc
 *  - OAuth authorize:  {OLX_HOST}/oauth/authorize/
 *  - OAuth token:      {OLX_HOST}/api/open/oauth/token
 *  - API base:         {OLX_HOST}/api/partner  (header `Version: 2.0`)
 * Requires partner credentials approved by OLX: OLX_CLIENT_ID / OLX_CLIENT_SECRET.
 */

export const OLX_HOST = process.env.OLX_HOST ?? "https://www.olx.kz";
const SCOPE = "v2 read write";
const COOKIE = "unload_olx";

export function olxConfigured() {
  return Boolean(process.env.OLX_CLIENT_ID && process.env.OLX_CLIENT_SECRET);
}

type Tokens = { access_token: string; refresh_token?: string; expires_at: number; account?: string };

/* Tokens are kept in an encrypted, httpOnly cookie — never exposed to client JS. */
function key() {
  return crypto.createHash("sha256").update(`unload-olx:${process.env.OLX_CLIENT_SECRET ?? ""}`).digest();
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

export function authorizeUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.OLX_CLIENT_ID!,
    response_type: "code",
    scope: SCOPE,
    state,
    redirect_uri: redirectUri,
  });
  return `${OLX_HOST}/oauth/authorize/?${q}`;
}

export async function exchangeToken(params: Record<string, string>): Promise<Tokens> {
  const r = await fetch(`${OLX_HOST}/api/open/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      ...params,
      client_id: process.env.OLX_CLIENT_ID,
      client_secret: process.env.OLX_CLIENT_SECRET,
      scope: SCOPE,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new OlxError(j.error_description ?? j.error ?? `OLX token error (HTTP ${r.status})`, r.status);
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000,
  };
}

export class OlxError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function validTokens(): Promise<Tokens> {
  const t = await readTokens();
  if (!t) throw new OlxError("OLX account is not connected.", 401);
  if (t.expires_at - 60_000 > Date.now()) return t;
  if (!t.refresh_token) throw new OlxError("OLX authorization expired. Connect the account again.", 401);
  const fresh = await exchangeToken({ grant_type: "refresh_token", refresh_token: t.refresh_token });
  const next = { ...fresh, refresh_token: fresh.refresh_token ?? t.refresh_token, account: t.account };
  await writeTokens(next);
  return next;
}

/** Authenticated call to the Partner API. Throws OlxError with OLX's validation details. */
export async function olx<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const t = await validTokens();
  const r = await fetch(`${OLX_HOST}/api/partner${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${t.access_token}`,
      Version: "2.0",
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (r.status === 204) return {} as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = j.error ?? {};
    const details = (e.validation ?? []).map((v: { field?: string; detail?: string; title?: string }) =>
      [v.field, v.detail ?? v.title].filter(Boolean).join(": "),
    );
    throw new OlxError(details.length ? details.join("; ") : (e.detail ?? e.title ?? `OLX API error (HTTP ${r.status})`), r.status);
  }
  return j as T;
}

export function errorResponse(e: unknown) {
  if (e instanceof OlxError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Unexpected error talking to OLX." }, { status: 502 });
}
