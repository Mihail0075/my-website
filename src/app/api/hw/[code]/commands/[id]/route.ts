import { route } from "@/lib/http";
import { requireController } from "@/lib/hw";
import { completeCommand } from "@/lib/services/lockers";

type Ctx = { params: Promise<{ code: string; id: string }> };

/** Controller reports a command as executed. */
export const POST = route(
  async (req, { params }: Ctx) => {
    const { code, id } = await params;
    const stationId = await requireController(req, code);
    await completeCommand(stationId, id);
    return { ok: true };
  },
  { sameOrigin: false },
);
