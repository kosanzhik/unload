import { put } from "@vercel/blob";
import { readTokens as olxTokens } from "@/lib/server/olx";
import { readTokens as ebayTokens } from "@/lib/server/ebay";

const MAX = 5 * 1024 * 1024;

/**
 * Hosts a listing photo publicly so a marketplace can fetch it.
 * Called only when the seller publishes to a connected marketplace — photos
 * are never uploaded before that, and only connected sellers may upload.
 */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Photo hosting isn't configured." }, { status: 501 });
  const [o, e] = await Promise.all([olxTokens(), ebayTokens()]);
  if (!o && !e) return Response.json({ error: "Connect a marketplace before publishing photos." }, { status: 401 });

  const { dataUrl, name } = (await req.json()) as { dataUrl?: string; name?: string };
  const m = dataUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return Response.json({ error: "Only JPEG, PNG or WebP photos." }, { status: 400 });
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX) return Response.json({ error: "Photo is larger than 5 MB." }, { status: 413 });

  const ext = m[1].split("/")[1].replace("jpeg", "jpg");
  const safe = (name ?? "photo").toLowerCase().replace(/\.[a-z]+$/, "").replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "photo";
  const blob = await put(`listings/${safe}.${ext}`, bytes, { access: "public", addRandomSuffix: true, contentType: m[1] });
  return Response.json({ url: blob.url });
}
