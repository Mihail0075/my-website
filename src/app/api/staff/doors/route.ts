import { assertStationAllowed, requireStaff } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { readJson, route, str } from "@/lib/http";
import { closeDoorSimulated } from "@/lib/services/parcels";

/** Driver/counter "door closed" in simulation (real lockers report this from the door sensor). */
export const POST = route(async (req) => {
  const session = await requireStaff(["DRIVER", "COUNTER"]);
  const body = await readJson(req);
  const stationId = str(body.stationId);
  assertStationAllowed(session, stationId);
  if (typeof body.lockerNumber !== "number") throw new AppError("VALIDATION");
  await closeDoorSimulated(stationId, body.lockerNumber);
  return { ok: true };
});
