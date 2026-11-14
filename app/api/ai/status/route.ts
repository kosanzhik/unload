import { connection } from "next/server";
import { claudeEnabled, MODEL } from "@/lib/server/claude";
import { olxConfigured } from "@/lib/server/olx";

export async function GET() {
  await connection(); // read env at request time, never at build
  return Response.json({ claude: claudeEnabled(), model: claudeEnabled() ? MODEL : null, olxConfigured: olxConfigured() });
}
