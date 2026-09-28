"use client";

import type { ParcelStatus } from "@/db/schema";
import { useI18n } from "./I18nProvider";

const tone: Record<ParcelStatus, string> = {
  AWAITING_PAYMENT: "bg-warning-soft text-warning",
  AWAITING_DROPOFF: "bg-accent-soft text-warning",
  AT_ORIGIN: "bg-info-soft text-info",
  IN_TRANSIT: "bg-info-soft text-info",
  READY_FOR_PICKUP: "bg-success-soft text-success",
  PICKED_UP: "bg-surface-alt text-muted",
  EXPIRED: "bg-danger-soft text-danger",
  RETURNED: "bg-danger-soft text-danger",
  CANCELLED: "bg-surface-alt text-muted",
};

export function StatusBadge({ status }: { status: ParcelStatus }) {
  const { t } = useI18n();
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${tone[status]}`}>{t.status[status]}</span>;
}
