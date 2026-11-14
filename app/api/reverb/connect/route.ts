import { connectToken, errorResponse, ReverbError, type ReverbEnv } from "@/lib/server/reverb";

/** Seller pastes their Reverb Personal Access Token; we validate it and store it encrypted. */
export async function POST(req: Request) {
  try {
    const { token, env } = (await req.json()) as { token?: string; env?: ReverbEnv };
    if (!token || token.trim().length < 20) throw new ReverbError("Paste the full Personal Access Token from Reverb.", 400);
    const account = await connectToken(token, env === "sandbox" ? "sandbox" : "production");
    return Response.json({ ok: true, account });
  } catch (e) {
    return errorResponse(e);
  }
}
