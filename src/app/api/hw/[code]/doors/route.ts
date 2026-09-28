import { AppError } from "@/lib/errors";
import { readJson, route } from "@/lib/http";
import { requireController } from "@/lib/hw";
import { setDoorState } from "@/lib/services/lockers";

type Ctx = { params: Promise<{ code: string }> };

/** Controller reports a door sensor change: { "number": 14, "open": false }. */
export const POST = route(
  async (req, { params }: Ctx) => {
    const stationId = await requireController(req, (await params).code);
    const { number, open } = await readJson(req);
    if (typeof number !== "number" || typeof open !== "boolean") throw new AppError("VALIDATION");
    await setDoorState(stationId, number, open);
    return { ok: true };
  },
  { sameOrigin: false },
);
