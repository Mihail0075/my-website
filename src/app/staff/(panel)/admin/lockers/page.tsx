import { LockerGrid } from "@/components/staff/LockerGrid";
import { StationTabs } from "@/components/staff/StationTabs";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { lockerMode } from "@/lib/services/lockers";
import { getStations } from "@/lib/services/parcels";

export default async function LockersPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  await requireStaffPage(["ADMIN"]);
  const { lang, t } = await getI18n();
  const stations = await getStations();
  const { station: code } = await searchParams;
  const station = stations.find((s) => s.code === code?.toUpperCase()) ?? stations[0];
  const simulated = lockerMode() === "simulated";
  return (
    <>
      <h1 className="mb-4 text-3xl font-extrabold">
        {t.staff.nav.lockers}
        {simulated && <span className="ml-3 rounded-full bg-accent-soft px-3 py-1 align-middle text-sm font-semibold text-warning">{t.staff.admin.simulator}</span>}
      </h1>
      <StationTabs stations={stations} current={station.id} lang={lang} basePath="/staff/admin/lockers" />
      <LockerGrid key={station.id} stationId={station.id} simulated={simulated} />
    </>
  );
}
