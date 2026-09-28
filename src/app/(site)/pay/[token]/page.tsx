import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { formatPrice, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { findParcel, getStations } from "@/lib/services/parcels";
import { PayForm } from "./PayForm";

export const metadata = { robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { lang, t } = await getI18n();
  const parcel = await findParcel({ senderToken: token });
  if (!parcel) notFound();
  if (parcel.paymentStatus === "PAID" || parcel.status !== "AWAITING_PAYMENT") redirect(`/p/${token}`);
  const stations = await getStations();
  const from = stations.find((s) => s.id === parcel.originStationId)!;
  const to = stations.find((s) => s.id === parcel.destinationStationId)!;
  const price = formatPrice(parcel.priceDenars, lang);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-3xl font-extrabold">{t.pay.title}</h1>
      <Card className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-semibold text-ink">
            {stationName(from, lang)} → {stationName(to, lang)}
          </p>
          <p className="text-sm text-muted">
            {t.sizes[parcel.size]} ({parcel.size}) · {parcel.trackingNumber}
          </p>
        </div>
        <p className="text-2xl font-extrabold text-brand">{price}</p>
      </Card>
      <Card>
        <PayForm token={token} priceLabel={price} />
      </Card>
    </div>
  );
}
