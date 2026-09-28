import { requireStaff } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { route } from "@/lib/http";
import { adminOpenLocker, getLocker, lockerMode, setDoorState, setOutOfService } from "@/lib/services/lockers";

type Ctx = { params: Promise<{ id: string; action: string }> };

export const POST = route(async (_req, { params }: Ctx) => {
  await requireStaff(["ADMIN"]);
  const { id, action } = await params;
  if (action === "open") return adminOpenLocker(id);
  if (action === "disable") return setOutOfService(id, true);
  if (action === "enable") return setOutOfService(id, false);
  if (action === "close") {
    if (lockerMode() !== "simulated") throw new AppError("NOT_SIMULATED");
    const locker = await getLocker(id);
    if (!locker) throw new AppError("NOT_FOUND");
    return setDoorState(locker.stationId, locker.number, false);
  }
  throw new AppError("NOT_FOUND");
});
