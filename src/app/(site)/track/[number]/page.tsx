import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { Alert, Card, Code } from "@/components/ui";
import { formatDateTime, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { findParcel, getStations, parcelEventsOf, sweep } from "@/lib/services/parcels";
import { TrackForm } from "../TrackForm";

export const metadata = { robots: { index: false } };

/** Public tracking: status and history only — no names, phones or codes. */
export default async function TrackNumberPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const { lang, t } = await getI18n();
  await sweep();
  const clean = decodeURIComponent(number).replace(/\s/g, "");
  const parcel = /^\d{10}$/.test(clean) ? await findParcel({ tracking: clean }) : null;

  if (!parcel) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
        <h1 className="text-3xl font-extrabold">{t.track.title}</h1>
        <Alert tone="warning">{t.track.notFound}</Alert>
        <Card>
          <TrackForm initial={clean} />
        </Card>
      </div>
    );
  }

  const [stations, events] = await Promise.all([getStations(), parcelEventsOf(parcel.id)]);
  const byId = new Map(stations.map((s) => [s.id, s]));
  const from = byId.get(parcel.originStationId)!;
  const to = byId.get(parcel.destinationStationId)!;
  const publicEvents = events
    .filter((e) => e.type !== "DROPOFF_CANCELLED")
    .map((e) => ({
      id: e.id,
      label: t.events[e.type as keyof typeof t.events] ?? e.type,
      when: formatDateTime(e.createdAt, lang),
      detail: e.stationId ? stationName(byId.get(e.stationId)!, lang) : null,
    }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-extrabold">{t.track.title}</h1>
      <Card className="flex flex-col gap-3">
        <Code value={parcel.trackingNumber} label={t.sender.trackingNumber} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted">
            {stationName(from, lang)} → {stationName(to, lang)}
          </span>
          <StatusBadge status={parcel.status} />
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t.track.history}</h2>
        <Timeline events={publicEvents} />
      </Card>
    </div>
  );
}
