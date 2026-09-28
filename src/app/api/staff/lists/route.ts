import { assertStationAllowed, requireStaff } from "@/lib/auth";
import { route } from "@/lib/http";
import { counterLists, driverLists, type ParcelRow } from "@/lib/services/parcels";

/** Only what the driver/counter screens need — no contact details. */
function slim(p: ParcelRow) {
  return {
    id: p.id,
    trackingNumber: p.trackingNumber,
    size: p.size,
    status: p.status,
    lockerNumber: p.lockerNumber,
    recipientName: p.recipientName,
    deliveryType: p.deliveryType,
    pickupDeadline: p.pickupDeadline,
    createdVia: p.createdVia,
  };
}

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const stationId = url.searchParams.get("station") ?? "";
  const kind = url.searchParams.get("kind");
  const session = await requireStaff(kind === "counter" ? ["COUNTER"] : ["DRIVER"]);
  assertStationAllowed(session, stationId);
  if (kind === "counter") {
    const lists = await counterLists(stationId);
    return { waitingDriver: lists.waitingDriver.map(slim), forPickup: lists.forPickup.map(slim) };
  }
  const lists = await driverLists(stationId);
  return {
    unload: lists.unload.map(slim),
    load: lists.load.map(slim),
    pending: lists.pending.map(slim),
    expired: lists.expired.map(slim),
  };
});
