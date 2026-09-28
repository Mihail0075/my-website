import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { lockers } from "@/db/schema";
import { KioskApp } from "@/components/kiosk/KioskApp";
import { Qr } from "@/components/Qr";
import { getKioskStationId } from "@/lib/auth";
import { appUrl } from "@/lib/config";
import { getStationByCode, getStations } from "@/lib/services/parcels";

export const metadata = { title: "Kiosk", robots: { index: false } };

export default async function KioskPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const station = await getStationByCode(code);
  if (!station) notFound();
  const registered = await getKioskStationId();
  if (registered !== station.id) redirect("/kiosk");

  const [allStations, layout] = await Promise.all([
    getStations(),
    db.select({ number: lockers.number, size: lockers.size }).from(lockers).where(eq(lockers.stationId, station.id)).orderBy(asc(lockers.number)),
  ]);
  // Links in QR codes must point at the address people can reach from their phones.
  const host = (await headers()).get("host");
  const origin = process.env.APP_URL ? appUrl() : `http://${host}`;

  return (
    <KioskApp
      station={{ id: station.id, code: station.code, nameMk: station.nameMk, nameEn: station.nameEn, hasCounter: station.hasCounter }}
      stations={allStations.map(({ id, code, nameMk, nameEn }) => ({ id, code, nameMk, nameEn }))}
      lockers={layout}
      origin={origin}
      phoneQr={<Qr value={`${origin}/send?from=${station.code}`} label="QR" className="h-56 w-56" />}
    />
  );
}
