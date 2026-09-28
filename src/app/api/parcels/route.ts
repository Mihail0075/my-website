import { requireKiosk } from "@/lib/auth";
import { readJson, route } from "@/lib/http";
import { createParcel } from "@/lib/services/parcels";

/** Create a parcel online (phone/computer) or at a registered kiosk. */
export const POST = route(async (req) => {
  const body = await readJson(req);
  const parcel =
    body.via === "KIOSK"
      ? await createParcel(body, { via: "KIOSK", kioskStationId: await requireKiosk() })
      : await createParcel(body, { via: "ONLINE" });
  return {
    senderToken: parcel.senderToken,
    trackingNumber: parcel.trackingNumber,
    priceDenars: parcel.priceDenars,
    destinationStationId: parcel.destinationStationId,
  };
});
