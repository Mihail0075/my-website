import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { inputClass } from "@/components/ui";
import { parcelStatus, type ParcelStatus } from "@/db/schema";
import { formatDateTime, formatPrice, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { adminParcels, getStations } from "@/lib/services/parcels";

export default async function AdminParcels({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaffPage(["ADMIN"]);
  const { lang, t } = await getI18n();
  const { status, q } = await searchParams;
  const valid = parcelStatus.enumValues.includes(status as ParcelStatus) ? (status as ParcelStatus) : undefined;
  const [rows, stations] = await Promise.all([adminParcels(valid, q), getStations()]);
  const byId = new Map(stations.map((s) => [s.id, s]));
  const a = t.staff.admin;

  return (
    <>
      <h1 className="mb-4 text-3xl font-extrabold">{a.parcels}</h1>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row" method="get">
        <label htmlFor="q" className="sr-only">
          {t.common.search}
        </label>
        <input id="q" name="q" defaultValue={q} placeholder={`${t.common.search}…`} className={inputClass} />
        <label htmlFor="status" className="sr-only">
          {a.filterStatus}
        </label>
        <select id="status" name="status" defaultValue={valid ?? ""} className={`${inputClass} sm:max-w-72`}>
          <option value="">{t.common.all}</option>
          {parcelStatus.enumValues.map((s) => (
            <option key={s} value={s}>
              {t.status[s]}
            </option>
          ))}
        </select>
        <button className="min-h-12 rounded-[var(--radius-std)] bg-brand px-5 font-semibold text-white hover:bg-brand-hover">{t.common.search}</button>
      </form>
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((p) => (
          <li key={p.id}>
            <Link href={`/staff/admin/parcels/${p.id}`} className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-white p-4">
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-brand">{p.trackingNumber}</span>
                <span className="font-semibold">{formatPrice(p.priceDenars, lang)}</span>
              </span>
              <span className="text-sm text-muted">
                {stationName(byId.get(p.originStationId)!, lang)} → {stationName(byId.get(p.destinationStationId)!, lang)} · {p.recipientName}
              </span>
              <span>
                <StatusBadge status={p.status} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-alt text-muted">
            <tr>
              <th className="px-3 py-2">{t.sender.trackingNumber}</th>
              <th className="px-3 py-2">{a.route}</th>
              <th className="px-3 py-2">{t.sender.status}</th>
              <th className="px-3 py-2">{a.recipient}</th>
              <th className="px-3 py-2">{a.locker}</th>
              <th className="px-3 py-2">{t.send.price}</th>
              <th className="px-3 py-2">{a.created}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line hover:bg-surface-alt">
                <td className="px-3 py-2">
                  <Link href={`/staff/admin/parcels/${p.id}`} className="font-mono font-bold text-brand underline">
                    {p.trackingNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {stationName(byId.get(p.originStationId)!, lang)} → {stationName(byId.get(p.destinationStationId)!, lang)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-3 py-2">{p.recipientName}</td>
                <td className="px-3 py-2">{p.lockerNumber ?? "—"}</td>
                <td className="px-3 py-2">{formatPrice(p.priceDenars, lang)}</td>
                <td className="px-3 py-2 text-muted">{formatDateTime(p.createdAt, lang)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted">
                  {t.staff.driver.nothing}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
