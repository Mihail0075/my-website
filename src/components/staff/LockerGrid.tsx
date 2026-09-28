"use client";

import { useCallback, useEffect, useState } from "react";
import type { LockerView } from "@/lib/services/lockers";
import { errorMessage } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { lockerColumns } from "@/lib/lockerLayout";
import { useI18n } from "../I18nProvider";
import { Alert, Button } from "../ui";

/**
 * Live view of a station's lockers. While hardware is simulated this is the
 * "locker wall": open doors are highlighted and can be closed with a click.
 */
export function LockerGrid({ stationId, simulated }: { stationId: string; simulated: boolean }) {
  const { t } = useI18n();
  const a = t.staff.admin;
  const [lockers, setLockers] = useState<LockerView[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ lockers: LockerView[] }>(`/api/lockers?station=${stationId}`);
      setLockers(res.lockers);
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code) : t.common.genericError);
    }
  }, [stationId, t]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 2_000);
    return () => clearInterval(timer);
  }, [load]);

  async function action(id: string, name: string) {
    setError(null);
    try {
      await api(`/api/staff/lockers/${id}/${name}`, {});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code) : t.common.genericError);
    }
  }

  if (!lockers) return <p className="text-muted">{t.common.loading}</p>;
  const current = lockers.find((l) => l.id === selected);
  const columns = lockerColumns(lockers);
  const height = { S: "h-14", M: "h-24", L: "h-40" };

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex flex-wrap gap-4 text-sm">
        <Legend className="bg-white ring-1 ring-line" label={a.free} />
        <Legend className="bg-brand-soft ring-2 ring-brand" label={a.occupied} />
        <Legend className="bg-accent ring-2 ring-accent" label={a.doorOpen} />
        <Legend className="bg-surface-alt opacity-50 ring-1 ring-line" label={a.outOfService} />
      </div>
      <div className="flex items-start gap-2 overflow-x-auto rounded-[var(--radius-card)] bg-ink/5 p-4">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-2">
            {col.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelected(l.id === selected ? null : l.id)}
                aria-label={`${a.locker} ${l.number}`}
                className={`flex w-24 flex-col items-center justify-center rounded-md text-xs ${height[l.size]} ${
                  l.doorOpen
                    ? "bg-accent text-ink ring-2 ring-accent"
                    : l.outOfService
                      ? "bg-surface-alt text-muted opacity-50 ring-1 ring-line"
                      : l.parcel
                        ? "bg-brand-soft text-ink ring-2 ring-brand"
                        : "bg-white text-muted ring-1 ring-line"
                } ${selected === l.id ? "outline-3 outline-offset-2 outline-ink" : ""}`}
              >
                <span className="text-lg font-bold">{l.number}</span>
                <span>{l.size}</span>
                {l.parcel && <span className="font-mono text-[10px]">{l.parcel.trackingNumber}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      {current && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-std)] border border-line bg-white p-3">
          <span className="font-bold">
            {a.locker} {current.number} ({current.size})
          </span>
          {current.parcel && <span className="font-mono text-sm text-muted">{current.parcel.trackingNumber}</span>}
          <Button onClick={() => action(current.id, "open")}>{a.openLocker}</Button>
          {simulated && current.doorOpen && (
            <Button variant="secondary" onClick={() => action(current.id, "close")}>
              {a.closeDoor}
            </Button>
          )}
          <Button variant="ghost" onClick={() => action(current.id, current.outOfService ? "enable" : "disable")}>
            {current.outOfService ? a.backInService : a.outOfService}
          </Button>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-4 w-6 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
