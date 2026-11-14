import Anthropic from "@anthropic-ai/sdk";
import { analyzePhotos, claudeEnabled } from "@/lib/server/claude";

/** Photos (data URLs) → structured listing draft. 501 when Claude isn't configured. */
export async function POST(req: Request) {
  if (!claudeEnabled()) return Response.json({ error: "AI vision is not configured" }, { status: 501 });
  const { photos, hint } = (await req.json()) as { photos: string[]; hint?: string };
  const images = (photos ?? [])
    .map((p) => p.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({ mediaType: m[1], data: m[2] }));
  if (!images.length) return Response.json({ error: "No supported images (JPEG, PNG, WebP, GIF)." }, { status: 400 });
  try {
    return Response.json(await analyzePhotos(images, hint ?? ""));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "AI is busy — try again in a moment." }, { status: 429 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: `AI error (${e.status})` }, { status: 502 });
    return Response.json({ error: e instanceof Error ? e.message : "AI analysis failed" }, { status: 502 });
  }
}
