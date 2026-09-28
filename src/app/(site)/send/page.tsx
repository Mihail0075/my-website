import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getStations } from "@/lib/services/parcels";
import { OnlineSend } from "./OnlineSend";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.send.title };
}

/** Online sending. The QR poster at each station links here with ?from=<station code>. */
export default async function SendPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { t } = await getI18n();
  const { from } = await searchParams;
  const stations = await getStations();
  const origin = stations.find((s) => s.code === from?.toUpperCase());
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="mb-6 text-3xl font-extrabold">{t.send.title}</h1>
      <OnlineSend
        stations={stations.map(({ id, code, nameMk, nameEn }) => ({ id, code, nameMk, nameEn }))}
        defaultOriginId={origin?.id}
      />
    </div>
  );
}
