import { connection } from "next/server";
import { claudeStatus } from "@/lib/server/claude";
import { olxConfigured } from "@/lib/server/olx";

export async function GET() {
  await connection(); // read env/credits at request time, never at build
  const ai = await claudeStatus();
  return Response.json({ claude: ai.enabled, model: ai.model, via: ai.via, olxConfigured: olxConfigured() });
}
