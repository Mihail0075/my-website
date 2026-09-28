import { requireKiosk } from "@/lib/auth";
import { readJson, route, str } from "@/lib/http";
import { cancelDropoff } from "@/lib/services/parcels";

export const POST = route(async (req) => {
  const stationId = await requireKiosk();
  const { parcelId } = await readJson(req);
  await cancelDropoff(stationId, str(parcelId));
  return { ok: true };
});
