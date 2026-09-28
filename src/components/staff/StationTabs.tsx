import Link from "next/link";
import type { Station } from "@/db/schema";
import { stationName, type Lang } from "@/i18n";

/** Station switcher for admins/drivers (kept in the URL: ?station=PP). */
export function StationTabs({ stations, current, lang, basePath }: { stations: Station[]; current: string; lang: Lang; basePath: string }) {
  return (
    <div className="mb-6 inline-flex rounded-full border border-line bg-white p-1">
      {stations.map((s) => (
        <Link
          key={s.id}
          href={`${basePath}?station=${s.code}`}
          aria-current={s.id === current ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-full px-5 font-semibold ${s.id === current ? "bg-brand text-white" : "text-muted hover:text-ink"}`}
        >
          {stationName(s, lang)}
        </Link>
      ))}
    </div>
  );
}
