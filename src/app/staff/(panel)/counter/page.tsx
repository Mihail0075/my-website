import { CounterPanel } from "@/components/staff/CounterPanel";
import { StationTabs } from "@/components/staff/StationTabs";
import { stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { getStations } from "@/lib/services/parcels";

export default async function CounterPage({ searchParams }: { searchParams: Promise<{ station?: string }> }) {
  const { user } = await requireStaffPage(["COUNTER"]);
  const { lang, t } = await getI18n();
  const stations = await getStations();
  const { station: code } = await searchParams;
  // Counter staff work at their own station; admins can open any counter station.
  const counterStations = stations.filter((s) => s.hasCounter);
  const station =
    user.role === "COUNTER"
      ? stations.find((s) => s.id === user.stationId)
      : (counterStations.find((s) => s.code === code?.toUpperCase()) ?? counterStations[0]);
  if (!station) return <p>{t.errors.FORBIDDEN}</p>;

  return (
    <>
      <h1 className="mb-4 text-3xl font-extrabold">
        {t.staff.counter.title} — {stationName(station, lang)}
      </h1>
      {user.role === "ADMIN" && counterStations.length > 1 && <StationTabs stations={counterStations} current={station.id} lang={lang} basePath="/staff/counter" />}
      <CounterPanel
        key={station.id}
        stationId={station.id}
        stations={stations.map(({ id, code, nameMk, nameEn }) => ({ id, code, nameMk, nameEn }))}
      />
    </>
  );
}
