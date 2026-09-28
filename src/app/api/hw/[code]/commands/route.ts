import { route } from "@/lib/http";
import { requireController } from "@/lib/hw";
import { pendingCommands } from "@/lib/services/lockers";

type Ctx = { params: Promise<{ code: string }> };

/** Controller polls for doors to open. */
export const GET = route(async (req, { params }: Ctx) => {
  const stationId = await requireController(req, (await params).code);
  return { commands: await pendingCommands(stationId) };
});
