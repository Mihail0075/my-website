import { headers } from "next/headers";
import { Qr } from "@/components/Qr";
import { KioskControls } from "@/components/staff/KioskControls";
import { Card } from "@/components/ui";
import { fmt, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { appUrl } from "@/lib/config";
import { getStations } from "@/lib/services/parcels";

export default async function KiosksPage() {
  await requireStaffPage(["ADMIN"]);
  const { lang, t } = await getI18n();
  const a = t.staff.admin;
  const stations = await getStations();
  const host = (await headers()).get("host");
  const origin = process.env.APP_URL ? appUrl() : `http://${host}`;
  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold">{a.kiosks}</h1>
      <p className="mb-6 text-muted">{a.kiosksNote}</p>
      <div className="grid gap-6 md:grid-cols-2">
        {stations.map((s) => {
          const name = stationName(s, lang);
          return (
            <Card key={s.id} className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold">{name}</h2>
              <KioskControls stationId={s.id} stationCode={s.code} activateLabel={fmt(a.activate, { station: name })} revokeLabel={fmt(a.revoke, { station: name })} />
              <div className="flex items-center gap-4 border-t border-line pt-4">
                <Qr value={`${origin}/send?from=${s.code}`} label={a.posterTitle} className="h-32 w-32" />
                <div>
                  <p className="font-semibold">{a.posterTitle}</p>
                  <p className="text-sm text-muted">{a.posterHelp}</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">
                    {origin}/send?from={s.code}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
