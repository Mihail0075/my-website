import { createSession, requireKiosk } from "@/lib/auth";
import { KIOSK_STAFF_SESSION_MINUTES } from "@/lib/config";
import { readJson, route, str } from "@/lib/http";
import { verifyServicePin } from "@/lib/services/staff";

/** Driver signs in at the kiosk with a service PIN; the session only works at this station. */
export const POST = route(async (req) => {
  const stationId = await requireKiosk();
  const { pin } = await readJson(req);
  const user = await verifyServicePin(stationId, str(pin));
  await createSession(user.id, { minutes: KIOSK_STAFF_SESSION_MINUTES, kioskStationId: stationId });
  return { name: user.name };
});
