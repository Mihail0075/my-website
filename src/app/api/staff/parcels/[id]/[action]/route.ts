import { assertStationAllowed, requireStaff } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { readJson, route, str } from "@/lib/http";
import {
  cancelParcel,
  confirmPlaced,
  extendDeadline,
  handoverAtCounter,
  loadParcel,
  moveToBiggerLocker,
  removeExpired,
  unloadParcel,
} from "@/lib/services/parcels";

type Ctx = { params: Promise<{ id: string; action: string }> };

export const POST = route(async (req, { params }: Ctx) => {
  const { id, action } = await params;
  const body = await readJson(req);
  const stationId = str(body.stationId);

  switch (action) {
    case "load":
    case "unload":
    case "placed":
    case "bigger":
    case "remove": {
      const session = await requireStaff(["DRIVER"]);
      assertStationAllowed(session, stationId);
      const userId = session.user.id;
      if (action === "load") return loadParcel(id, stationId, userId);
      if (action === "unload") return unloadParcel(id, stationId, userId, body.mode === "COUNTER" ? "COUNTER" : "LOCKER");
      if (action === "placed") return confirmPlaced(id, stationId, userId);
      if (action === "bigger") return moveToBiggerLocker(id, stationId, userId);
      return removeExpired(id, stationId, userId);
    }
    case "handover": {
      const session = await requireStaff(["COUNTER"]);
      assertStationAllowed(session, stationId);
      return handoverAtCounter(id, str(body.pin), stationId, session.user.id);
    }
    case "extend": {
      const session = await requireStaff(["ADMIN"]);
      return extendDeadline(id, session.user.id);
    }
    case "cancel": {
      const session = await requireStaff(["ADMIN"]);
      return cancelParcel(id, session.user.id);
    }
    default:
      throw new AppError("NOT_FOUND");
  }
});
