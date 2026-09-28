import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { ParcelActions } from "@/components/staff/ParcelActions";
import { Timeline } from "@/components/Timeline";
import { Card, Code } from "@/components/ui";
import { formatDateTime, formatPrice, formatWeight, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { notificationsForParcel } from "@/lib/services/notify";
import { getParcelRow, getStations, parcelEventsOf } from "@/lib/services/parcels";

export default async function AdminParcel({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage(["ADMIN"]);
  const { id } = await params;
  const { lang, t } = await getI18n();
  const parcel = /^[0-9a-f-]{36}$/.test(id) ? await getParcelRow(id) : null;
  if (!parcel) notFound();
  const [stations, events, mails] = await Promise.all([getStations(), parcelEventsOf(parcel.id), notificationsForParcel(parcel.id)]);
  const byId = new Map(stations.map((s) => [s.id, s]));
  const a = t.staff.admin;
  const row = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Code value={parcel.trackingNumber} />
        <StatusBadge status={parcel.status} />
      </div>
      <ParcelActions id={parcel.id} status={parcel.status} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <dl className="grid gap-3 sm:grid-cols-2">
            {row(a.route, `${stationName(byId.get(parcel.originStationId)!, lang)} → ${stationName(byId.get(parcel.destinationStationId)!, lang)}`)}
            {row(t.send.parcel, `${t.sizes[parcel.size]} (${parcel.size}), ${formatWeight(parcel.weightGrams, lang)}`)}
            {row(a.sender, <>{parcel.senderName}<br />{parcel.senderPhone}<br />{parcel.senderEmail}</>)}
            {row(a.recipient, <>{parcel.recipientName}<br />{parcel.recipientPhone}<br />{parcel.recipientEmail}</>)}
            {row(a.payment, `${formatPrice(parcel.priceDenars, lang)} · ${parcel.paymentMethod ?? "—"} · ${parcel.paymentStatus}`)}
            {row(t.send.deliveryType, `${t.delivery[parcel.deliveryType]}${parcel.deliveryAddress ? ` — ${parcel.deliveryAddress}` : ""}`)}
            {row(a.locker, parcel.lockerNumber ?? "—")}
            {row(a.deadline, parcel.pickupDeadline ? formatDateTime(parcel.pickupDeadline, lang) : "—")}
            {row(t.pickup.pin, <span className="font-mono">{parcel.pickupPin}</span>)}
            {row(t.sender.dropoffCode, <span className="font-mono">{parcel.dropoffCode ?? "—"}</span>)}
            {parcel.note && row(t.send.note, parcel.note)}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold">{a.history}</h2>
          <Timeline
            events={events.map((e) => ({
              id: e.id,
              label: t.events[e.type as keyof typeof t.events] ?? e.type,
              when: formatDateTime(e.createdAt, lang),
              detail: [e.stationId ? stationName(byId.get(e.stationId)!, lang) : null, e.lockerNumber ? `${a.locker} ${e.lockerNumber}` : null, e.note]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-bold">{a.messages}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {mails.map((m) => (
            <li key={m.id} className="rounded border border-line p-2">
              <span className="font-semibold">{m.subject}</span> → {m.recipient} <span className="text-muted">({m.status})</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
