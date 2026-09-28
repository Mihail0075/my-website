import { requireKiosk } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { readJson, route, str } from "@/lib/http";
import { pickupAtKiosk } from "@/lib/services/parcels";

/** Extract the pickup token from a scanned QR (full /pickup/<token> URL or the bare token). */
function tokenFromScan(scan: string): string {
  const match = scan.trim().match(/\/pickup\/([\w-]+)/);
  return match ? match[1] : scan.trim();
}

export const POST = route(async (req) => {
  const stationId = await requireKiosk();
  const body = await readJson(req);
  if (typeof body.pin === "string") return pickupAtKiosk(stationId, { pin: body.pin });
  if (typeof body.scan === "string") return pickupAtKiosk(stationId, { token: tokenFromScan(str(body.scan)) });
  throw new AppError("VALIDATION");
});
