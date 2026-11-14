import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getVercelOidcToken } from "@vercel/oidc";
import { z } from "zod";

/**
 * Claude integration (server only). Enabled when ANTHROPIC_API_KEY is set;
 * otherwise the app runs its deterministic demo pipeline and says so in the UI.
 */

/**
 * Two ways to reach Claude, tried in order:
 *  1. ANTHROPIC_API_KEY → Anthropic API directly (claude-opus-5-5, server-side refusal fallbacks).
 *  2. Vercel AI Gateway with the deployment's OIDC token (anthropic/claude-opus-5.5) —
 *     needs AI Gateway credits on the Vercel team. Checked with the free /v1/credits endpoint.
 * Neither available → the app runs its deterministic demo pipeline and says so in the UI.
 */
const GATEWAY = "https://ai-gateway.vercel.sh";
const DIRECT_MODEL = "claude-opus-5-5";
const GATEWAY_MODEL = "anthropic/claude-opus-5.5";

type Conn = { client: Anthropic; model: string; direct: boolean };

let direct: Anthropic | null = null;
async function connect(): Promise<Conn | null> {
  if (process.env.ANTHROPIC_API_KEY) {
    direct ??= new Anthropic();
    return { client: direct, model: DIRECT_MODEL, direct: true };
  }
  const token = await getVercelOidcToken().catch(() => process.env.VERCEL_OIDC_TOKEN ?? null);
  if (!token) return null;
  return { client: new Anthropic({ baseURL: GATEWAY, apiKey: token }), model: GATEWAY_MODEL, direct: false };
}

let probe: { at: number; ok: boolean } | null = null;
/** Is Claude usable right now? (cached for 5 minutes; the gateway check costs nothing) */
export async function claudeStatus(): Promise<{ enabled: boolean; model: string | null; via: "anthropic" | "gateway" | null }> {
  if (process.env.ANTHROPIC_API_KEY) return { enabled: true, model: DIRECT_MODEL, via: "anthropic" };
  if (!probe || Date.now() - probe.at > 300_000) {
    let ok = false;
    try {
      const token = await getVercelOidcToken().catch(() => process.env.VERCEL_OIDC_TOKEN ?? null);
      if (token) {
        const r = await fetch(`${GATEWAY}/v1/credits`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const j = r.ok ? await r.json() : null;
        ok = Number(j?.balance ?? 0) > 0;
      }
    } catch {}
    probe = { at: Date.now(), ok };
  }
  return probe.ok ? { enabled: true, model: GATEWAY_MODEL, via: "gateway" } : { enabled: false, model: null, via: null };
}

export async function claudeEnabled() {
  return (await claudeStatus()).enabled;
}

/** Structured-output request on whichever connection is available. */
async function parse<T extends z.ZodType>(
  schema: T,
  req: { system: string; messages: Anthropic.MessageParam[]; effort: "low" | "medium"; maxTokens: number },
): Promise<z.infer<T> | null> {
  const c = await connect();
  if (!c) throw new Error("AI is not configured");
  if (c.direct) {
    const res = await c.client.beta.messages.parse({
      model: c.model,
      max_tokens: req.maxTokens,
      output_config: { effort: req.effort, format: betaZodOutputFormat(schema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: req.system,
      messages: req.messages as Anthropic.Beta.BetaMessageParam[],
    });
    return res.stop_reason === "refusal" ? null : (res.parsed_output as z.infer<T> | null);
  }
  const res = await c.client.messages.parse({
    model: c.model,
    max_tokens: req.maxTokens,
    output_config: { effort: req.effort, format: zodOutputFormat(schema) },
    system: req.system,
    messages: req.messages,
  });
  return res.stop_reason === "refusal" ? null : (res.parsed_output as z.infer<T> | null);
}

/* ---------- Vision: photos → listing draft ---------- */

const Analysis = z.object({
  title: z.string().describe("Honest listing title, max 70 characters, no hype"),
  category: z.enum([
    "Electronics",
    "Computers & accessories",
    "Audio",
    "Home & furniture",
    "Books",
    "Clothing & shoes",
    "Kitchen",
    "Sports & outdoors",
    "Kids & toys",
    "Other",
  ]),
  brand: z.string().describe("Only if clearly visible (logo or label). Empty string otherwise."),
  model: z.string().describe("Only if clearly visible on a label. Empty string otherwise."),
  apparentCondition: z.enum(["New", "Like new", "Good", "Fair", "For parts"]),
  conditionNotes: z.array(z.string()).describe("Wear or damage visible in the photos"),
  description: z.string().describe("Honest description using only what is visible; mention that details are to be confirmed"),
  attributes: z.array(z.object({ name: z.string(), value: z.string() })).describe("Only attributes visible in the photos"),
  missing: z.array(z.string()).describe("Important facts a buyer will want that photos can't show"),
  sellerQuestions: z
    .array(z.object({ question: z.string(), why: z.string(), topic: z.string() }))
    .describe("At most 4 essential questions for the seller; topic is a 1-3 word key like 'hdmi' or 'battery'"),
});
export type AnalysisResult = z.infer<typeof Analysis>;

const ANALYZE_SYSTEM = `You prepare secondhand resale listings from a seller's photos.
Rules:
- Describe only what is visible. Never invent specifications, model numbers, authenticity, or functionality.
- Brand/model: fill only when a logo or label is clearly readable; otherwise leave empty and add it to "missing".
- Condition: judge only visible wear; functionality is always unverified until the seller confirms.
- Never estimate prices or market value.
- Ask the seller only questions that materially affect a buyer's decision.
- Write in natural American English.`;

export async function analyzePhotos(images: { mediaType: string; data: string }[], hint: string) {
  const out = await parse(Analysis, {
    system: ANALYZE_SYSTEM,
    effort: "medium",
    maxTokens: 16000,
    messages: [
      {
        role: "user",
        content: [
          ...images.slice(0, 6).map((img) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: img.data,
            },
          })),
          { type: "text" as const, text: `These photos show one item for sale.${hint ? ` Seller's note: ${hint}` : ""}` },
        ],
      },
    ],
  });
  if (!out) throw new Error("The AI couldn't analyze these photos.");
  return out;
}

/* ---------- Sales agent phrasing ---------- */

const Reply = z.object({ reply: z.string() });

const REPLY_SYSTEM = `You write one short marketplace chat reply on behalf of a private seller's assistant.
Hard rules:
- Say only what the APPROVED REPLY says, in friendlier natural words. Keep every fact and every amount exactly.
- Do not add product features, condition claims, delivery options, prices, discounts, or promises that are not in the APPROVED REPLY or VERIFIED FACTS.
- Never mention any minimum price, floor, or internal rules.
- Never confirm a sale or a meeting — only the seller can.
- Plain text, 1–3 sentences, same language as the buyer.`;

export async function phraseReply(input: {
  buyerMessage: string;
  approvedReply: string;
  facts: unknown;
  history: { role: string; text: string }[];
}) {
  const out = await parse(Reply, {
    system: REPLY_SYSTEM,
    effort: "low",
    maxTokens: 2000,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          recentConversation: input.history.slice(-6),
          buyerMessage: input.buyerMessage,
          APPROVED_REPLY: input.approvedReply,
          VERIFIED_FACTS: input.facts,
        }),
      },
    ],
  });
  return out ? out.reply.trim() : null;
}
