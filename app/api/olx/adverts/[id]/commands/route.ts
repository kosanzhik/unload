import { errorResponse, olx, OlxError } from "@/lib/server/olx";

const COMMANDS = new Set(["activate", "deactivate", "finish"]);

/** Manage availability: POST /adverts/{id}/commands */
export async function POST(req: Request, ctx: RouteContext<"/api/olx/adverts/[id]/commands">) {
  try {
    const { id } = await ctx.params;
    const { command, isSuccess } = (await req.json()) as { command: string; isSuccess?: boolean };
    if (!COMMANDS.has(command)) throw new OlxError("Unknown command.", 400);
    await olx("POST", `/adverts/${encodeURIComponent(id)}/commands`, {
      command,
      ...(command === "deactivate" ? { is_success: Boolean(isSuccess) } : {}),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
