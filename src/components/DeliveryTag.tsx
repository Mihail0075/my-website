"use client";

import { useI18n } from "./I18nProvider";

/** Clear visual split: parcels collected at the bus station vs. parcels going to an address. */
export function DeliveryTag({ type, size = "md" }: { type: "LOCKER" | "COURIER"; size?: "md" | "lg" }) {
  const { t } = useI18n();
  const cls =
    type === "COURIER"
      ? "bg-[#4c1d95] text-white"
      : "bg-brand-soft text-brand ring-1 ring-brand/40";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${size === "lg" ? "px-4 py-1.5 text-lg" : "px-2.5 py-0.5 text-sm"} ${cls}`}>
      {type === "COURIER" ? "🛵" : "🚌"} {type === "COURIER" ? t.delivery.tagCourier : t.delivery.tagLocker}
    </span>
  );
}

export type DeliveryFilter = "ALL" | "LOCKER" | "COURIER";

export function DeliveryFilterTabs({ value, onChange, counts }: { value: DeliveryFilter; onChange: (v: DeliveryFilter) => void; counts?: Record<DeliveryFilter, number> }) {
  const { t } = useI18n();
  const opts: [DeliveryFilter, string][] = [
    ["ALL", t.common.all],
    ["LOCKER", `🚌 ${t.delivery.tagLocker}`],
    ["COURIER", `🛵 ${t.delivery.tagCourier}`],
  ];
  return (
    <div className="inline-flex flex-wrap rounded-full border border-line bg-white p-1" role="group">
      {opts.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`min-h-10 rounded-full px-4 font-semibold ${value === v ? (v === "COURIER" ? "bg-[#4c1d95] text-white" : "bg-brand text-white") : "text-muted hover:text-ink"}`}
        >
          {label}
          {counts ? ` (${counts[v]})` : ""}
        </button>
      ))}
    </div>
  );
}
