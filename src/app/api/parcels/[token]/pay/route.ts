import { getKioskStationId } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { route } from "@/lib/http";
import { findParcel, payParcel } from "@/lib/services/parcels";

/**
 * SIMULATED payment. With a real gateway (e.g. CaSys cPay) this is replaced
 * by the gateway's signed callback; it is disabled when PAYMENT_MODE=live.
 */
export const POST = route(async (_req, { params }: { params: Promise<{ token: string }> }) => {
  if (process.env.PAYMENT_MODE === "live") throw new AppError("NOT_FOUND");
  const { token } = await params;
  const parcel = await findParcel({ senderToken: token });
  if (!parcel) throw new AppError("NOT_FOUND");
  const kioskStation = await getKioskStationId();
  const method = kioskStation && kioskStation === parcel.originStationId ? "CARD_KIOSK" : "CARD_ONLINE";
  const paid = await payParcel(token, method, `SIM-${Date.now()}`);
  return { status: paid.status, dropoffCode: paid.dropoffCode, pickupPin: paid.pickupPin, trackingNumber: paid.trackingNumber };
});
