import { getKioskStationId, getSession } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { route } from "@/lib/http";
import { stationLockers } from "@/lib/services/lockers";

/** Locker grid for the simulator and admin views (staff, or the station's own kiosk). */
export const GET = route(async (req) => {
  const stationId = new URL(req.url).searchParams.get("station") ?? "";
  const [session, kioskStation] = await Promise.all([getSession(), getKioskStationId()]);
  const allowed = (session && !session.kioskStationId) || kioskStation === stationId || session?.kioskStationId === stationId;
  if (!allowed) throw new AppError("UNAUTHORIZED");
  return { lockers: await stationLockers(stationId) };
});
