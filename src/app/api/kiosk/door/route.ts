import { requireKiosk } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { readJson, route } from "@/lib/http";
import { closeDoorSimulated } from "@/lib/services/parcels";

/** "I closed the door" button — only meaningful while lockers are simulated. */
export const POST = route(async (req) => {
  const stationId = await requireKiosk();
  const { lockerNumber } = await readJson(req);
  if (typeof lockerNumber !== "number") throw new AppError("VALIDATION");
  await closeDoorSimulated(stationId, lockerNumber);
  return { ok: true };
});
