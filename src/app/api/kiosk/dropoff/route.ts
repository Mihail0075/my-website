import { requireKiosk } from "@/lib/auth";
import { readJson, route, str } from "@/lib/http";
import { startDropoff } from "@/lib/services/parcels";

export const POST = route(async (req) => {
  const stationId = await requireKiosk();
  const { code } = await readJson(req);
  return startDropoff(stationId, str(code));
});
