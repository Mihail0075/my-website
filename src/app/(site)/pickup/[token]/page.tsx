import { notFound } from "next/navigation";
import { Qr } from "@/components/Qr";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Card, Code } from "@/components/ui";
import { fmt, formatDateTime, stationAddress, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { findParcel, getStations, sweep } from "@/lib/services/parcels";
import { pickupLink } from "@/lib/services/notify";

export const metadata = { robots: { index: false } };

/** Recipient's page (the link in their message). The QR here is what the kiosk scanner reads. */
export default async function PickupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { lang, t } = await getI18n();
  await sweep();
  const parcel = await findParcel({ pickupToken: token });
  if (!parcel) notFound();
  const stations = await getStations();
  const to = stations.find((s) => s.id === parcel.destinationStationId)!;
  const from = stations.find((s) => s.id === parcel.originStationId)!;
  const station = `${stationName(to, lang)} (${stationAddress(to, lang)})`;
  const ready = parcel.status === "READY_FOR_PICKUP";
  const active = !["PICKED_UP", "CANCELLED", "RETURNED"].includes(parcel.status);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{t.pickup.title}</h1>
        <StatusBadge status={parcel.status} />
      </div>
      <p className="text-muted">
        {t.pickup.from}: {parcel.senderName} · {stationName(from, lang)} → {stationName(to, lang)}
      </p>

      {ready ? (
        <Alert tone="success">
          {parcel.lockerNumber !== null ? fmt(t.pickup.readyAt, { n: parcel.lockerNumber, station }) : fmt(t.pickup.readyCounter, { station })}{" "}
          {parcel.pickupDeadline && fmt(t.pickup.deadline, { date: formatDateTime(parcel.pickupDeadline, lang) })}
        </Alert>
      ) : parcel.status === "EXPIRED" ? (
        <Alert tone="danger">{t.errors.PARCEL_EXPIRED}</Alert>
      ) : active ? (
        <Alert tone="info">{t.pickup.notYet}</Alert>
      ) : null}

      {active && (
        <Card className="flex flex-col items-center gap-4 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t.pickup.pin}</p>
            <Code value={parcel.pickupPin} size="xl" label={t.pickup.pin} />
          </div>
          <Qr value={pickupLink(parcel)} label={t.pickup.qrHelp} className="h-56 w-56" />
          <p className="text-muted">{t.pickup.qrHelp}</p>
        </Card>
      )}
    </div>
  );
}
