import { requireStaff } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { readJson, route, str } from "@/lib/http";
import { createParcel } from "@/lib/services/parcels";

/** Counter staff accept a parcel and take payment (cash or card on the POS terminal). */
export const POST = route(async (req) => {
  const session = await requireStaff(["COUNTER"]);
  const body = await readJson(req);
  const payment = body.payment === "CASH" || body.payment === "CARD_POS" ? body.payment : null;
  if (!payment) throw new AppError("VALIDATION", { fields: { payment: "required" } });
  // Counter staff always send from their own station; admins pick one.
  const originStationId = session.user.role === "COUNTER" ? session.user.stationId : str(body.originStationId);
  const parcel = await createParcel({ ...body, originStationId }, { via: "COUNTER", userId: session.user.id, payment });
  return {
    id: parcel.id,
    trackingNumber: parcel.trackingNumber,
    shortNumber: parcel.shortNumber,
    pickupPin: parcel.pickupPin,
    senderToken: parcel.senderToken,
    priceDenars: parcel.priceDenars,
    destinationStationId: parcel.destinationStationId,
  };
});
