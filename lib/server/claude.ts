import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/**
 * Claude integration (server only). Enabled when ANTHROPIC_API_KEY is set;
 * otherwise the app runs its deterministic demo pipeline and says so in the UI.
 */

export const MODEL = "claude-opus-5-5";

export function claudeEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic();
  return client;
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
  const res = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(Analysis) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: ANALYZE_SYSTEM,
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
          { type: "text", text: `These photos show one item for sale.${hint ? ` Seller's note: ${hint}` : ""}` },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("The AI couldn't analyze these photos.");
  return res.parsed_output;
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
  const res = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low", format: betaZodOutputFormat(Reply) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: REPLY_SYSTEM,
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
  if (res.stop_reason === "refusal" || !res.parsed_output) return null;
  return res.parsed_output.reply.trim();
}
