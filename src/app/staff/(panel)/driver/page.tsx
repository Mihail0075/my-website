import { DriverPanel } from "@/components/staff/DriverPanel";
import { StationTabs } from "@/components/staff/StationTabs";
import { stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { getStations } from "@/lib/services/parcels";

/** Driver screen on a phone. The same panel opens on the kiosk after entering a service PIN. */
export default async function DriverPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const session = await requireStaffPage(["DRIVER"]);
  const { lang, t } = await getI18n();
  const stations = await getStations();
  const { station: code } = await searchParams;
  const allowed = session.kioskStationId ? stations.filter((s) => s.id === session.kioskStationId) : stations;
  const station = allowed.find((s) => s.code === code?.toUpperCase()) ?? allowed[0];
  if (!station) return null;

  return (
    <>
      <h1 className="mb-4 text-3xl font-extrabold">
        {t.staff.driver.title} — {stationName(station, lang)}
      </h1>
      {allowed.length > 1 && <StationTabs stations={allowed} current={station.id} lang={lang} basePath="/staff/driver" />}
      <DriverPanel key={station.id} stationId={station.id} hasCounter={station.hasCounter} />
    </>
  );
}
