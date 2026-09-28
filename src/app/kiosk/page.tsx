import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stations } from "@/db/schema";
import { getKioskStationId } from "@/lib/auth";
import { getI18n } from "@/i18n/server";

export const metadata = { robots: { index: false } };

/** Entry point for kiosk devices: go to this device's station, or explain how to register it. */
export default async function KioskIndex() {
  const stationId = await getKioskStationId();
  if (stationId) {
    const [s] = await db.select({ code: stations.code }).from(stations).where(eq(stations.id, stationId));
    if (s) redirect(`/kiosk/${s.code}`);
  }
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-extrabold">{t.kiosk.notRegisteredTitle}</h1>
      <p className="max-w-xl text-xl">{t.kiosk.notRegisteredText}</p>
      <Link href="/staff/login" className="text-lg font-semibold text-brand underline">
        {t.staff.loginTitle}
      </Link>
    </main>
  );
}
