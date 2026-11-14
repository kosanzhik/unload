import Anthropic from "@anthropic-ai/sdk";
import { claudeEnabled, phraseReply } from "@/lib/server/claude";

/**
 * Rephrases a policy-approved reply in natural words. The client re-checks the
 * result with the negotiation guard and falls back to the approved text.
 */
export async function POST(req: Request) {
  if (!claudeEnabled()) return Response.json({ error: "AI is not configured" }, { status: 501 });
  const body = await req.json();
  try {
    const reply = await phraseReply(body);
    return Response.json({ reply });
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? 502 : 500;
    return Response.json({ error: "AI phrasing failed" }, { status });
  }
}
