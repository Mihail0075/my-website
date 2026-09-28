import { notFound } from "next/navigation";
import { Qr } from "@/components/Qr";
import { ShareButtons } from "@/components/ShareButtons";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, ButtonLink, Card, Code } from "@/components/ui";
import { fmt, formatPrice, stationAddress, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { findParcel, getStations } from "@/lib/services/parcels";
import { pickupLink } from "@/lib/services/notify";

export const metadata = { robots: { index: false } };

/** Sender's page after paying: parcel number, drop-off code and the PIN to forward. */
export default async function SenderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { lang, t } = await getI18n();
  const parcel = await findParcel({ senderToken: token });
  if (!parcel) notFound();
  const stations = await getStations();
  const from = stations.find((s) => s.id === parcel.originStationId)!;
  const to = stations.find((s) => s.id === parcel.destinationStationId)!;
  const link = pickupLink(parcel);
  const shareText = fmt(t.sender.shareText, {
    tracking: parcel.trackingNumber,
    from: stationName(from, lang),
    to: stationName(to, lang),
    pin: parcel.pickupPin,
    link,
  });
  const paid = parcel.paymentStatus === "PAID";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{paid ? t.sender.paidTitle : t.sender.unpaidTitle}</h1>
        <StatusBadge status={parcel.status} />
      </div>

      <Card className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t.sender.trackingNumber}</p>
        <Code value={parcel.trackingNumber} label={t.sender.trackingNumber} />
        <p className="mt-2 text-muted">
          {stationName(from, lang)} → {stationName(to, lang)} · {t.sizes[parcel.size]} ({parcel.size}) · {formatPrice(parcel.priceDenars, lang)}
        </p>
      </Card>

      {!paid && parcel.status === "AWAITING_PAYMENT" && (
        <ButtonLink href={`/pay/${token}`} size="lg">
          {t.sender.goPay}
        </ButtonLink>
      )}

      {parcel.status === "AWAITING_DROPOFF" && parcel.dropoffCode && (
        <Card className="border-2 border-accent">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t.sender.dropoffCode}</p>
          <Code value={parcel.dropoffCode} size="xl" label={t.sender.dropoffCode} />
          <p className="mt-3">{fmt(t.sender.dropoffHelp, { station: `${stationName(from, lang)} (${stationAddress(from, lang)})` })}</p>
        </Card>
      )}

      {parcel.createdVia === "COUNTER" && parcel.status === "AT_ORIGIN" && <Alert tone="success">{t.sender.counterHelp}</Alert>}

      {paid && (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t.sender.pinTitle}</p>
              <Code value={parcel.pickupPin} size="xl" label={t.sender.pinTitle} />
              <p className="mt-2 max-w-sm text-muted">{fmt(t.sender.pinHelp, { station: stationName(to, lang) })}</p>
            </div>
            <Qr value={link} label={t.pickup.qrHelp} className="h-36 w-36 shrink-0" />
          </div>
          <ShareButtons text={shareText} />
        </Card>
      )}

      <ButtonLink href={`/track/${parcel.trackingNumber}`} variant="secondary">
        {t.sender.viewTracking}
      </ButtonLink>
    </div>
  );
}
