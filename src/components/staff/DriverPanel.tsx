"use client";

import { useCallback, useEffect, useState } from "react";
import type { LockerSize, ParcelStatus } from "@/db/schema";
import { errorMessage, fmt, formatDateTime } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { DeliveryFilterTabs, DeliveryTag, type DeliveryFilter } from "../DeliveryTag";
import { useI18n } from "../I18nProvider";
import { Alert, Button, inputClass, ShortNo, shortNo } from "../ui";

export type SlimParcel = {
  id: string;
  trackingNumber: string;
  shortNumber: number;
  size: LockerSize;
  status: ParcelStatus;
  lockerNumber: number | null;
  recipientName: string;
  deliveryType: "LOCKER" | "COURIER";
  pickupDeadline: string | null;
  createdVia: string;
};

type Lists = { unload: SlimParcel[]; load: SlimParcel[]; pending: SlimParcel[]; expired: SlimParcel[] };

/** What the driver must do right now at an open door. */
type OpenDoor =
  | { kind: "put"; parcel: SlimParcel; lockerNumber: number }
  | { kind: "take"; parcel: SlimParcel; lockerNumber: number };

export function DriverPanel({ stationId, hasCounter, big = false }: { stationId: string; hasCounter: boolean; big?: boolean }) {
  const { lang, t } = useI18n();
  const d = t.staff.driver;
  const [lists, setLists] = useState<Lists | null>(null);
  const [door, setDoor] = useState<OpenDoor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<DeliveryFilter>("ALL");

  const load = useCallback(async () => {
    try {
      setLists(await api<Lists>(`/api/staff/lists?station=${stationId}&kind=driver`));
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code) : t.common.genericError);
    }
  }, [stationId, t]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  async function act(parcel: SlimParcel, action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ lockerNumber: number | null } | { ok: true } | null>(`/api/staff/parcels/${parcel.id}/${action}`, { stationId, ...extra });
      const lockerNumber = res && "lockerNumber" in res ? res.lockerNumber : null;
      if (action === "unload" || action === "bigger") {
        setDoor(lockerNumber !== null ? { kind: "put", parcel, lockerNumber } : null);
      } else if (action === "load" || action === "remove") {
        setDoor(lockerNumber !== null ? { kind: "take", parcel, lockerNumber } : null);
      } else if (action === "placed") {
        setDoor(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code, err.details) : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function closeTakeDoor() {
    if (door?.kind !== "take") return;
    try {
      await api("/api/staff/doors", { stationId, lockerNumber: door.lockerNumber });
    } catch {
      // With real hardware the sensor closes it; nothing to do.
    }
    setDoor(null);
  }

  const match = (p: SlimParcel) => {
    if (kind !== "ALL" && p.deliveryType !== kind) return false;
    const q = filter.replace(/[\s#]/g, "");
    if (!q) return true;
    // Up to 4 digits = the short number on the label; longer = the full parcel number.
    return q.length <= 4 ? p.shortNumber === Number(q) : p.trackingNumber.includes(q);
  };
  const btn = big ? "lg" : "md";

  /** Scanner/typed number + Enter: do the obvious action for a single match. */
  function onFilterEnter() {
    if (!lists) return;
    const unload = lists.unload.filter(match);
    const loadable = lists.load.filter(match);
    if (unload.length === 1 && loadable.length === 0) act(unload[0], "unload", { mode: "LOCKER" });
    else if (loadable.length === 1 && unload.length === 0) act(loadable[0], "load");
    setFilter("");
  }

  return (
    <div className={`flex flex-col gap-6 ${big ? "text-lg" : ""}`}>
      {door && (
        <div className="sticky top-2 z-10 rounded-[var(--radius-card)] border-4 border-accent bg-accent-soft p-5 shadow-lg" role="alert">
          <p className={`font-extrabold text-ink ${big ? "text-4xl" : "text-2xl"}`}>{fmt(d.lockerOpen, { n: door.lockerNumber })}</p>
          <p className="mt-1 text-body">
            {fmt(door.kind === "put" ? d.putInto : d.takeFrom, { tracking: `${shortNo(door.parcel.shortNumber)} (${door.parcel.trackingNumber})`, n: door.lockerNumber })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {door.kind === "put" ? (
              <>
                <Button size={btn} disabled={busy} onClick={() => act(door.parcel, "placed")}>
                  {d.placed}
                </Button>
                {door.parcel.size !== "L" && (
                  <Button size={btn} variant="secondary" disabled={busy} onClick={() => act(door.parcel, "bigger")}>
                    {d.bigger}
                  </Button>
                )}
              </>
            ) : (
              <Button size={btn} disabled={busy} onClick={closeTakeDoor}>
                {t.common.done}
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <DeliveryFilterTabs value={kind} onChange={setKind} />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onFilterEnter();
        }}
      >
        <label htmlFor={`filter-${stationId}`} className="sr-only">
          {d.scanPlaceholder}
        </label>
        <input
          id={`filter-${stationId}`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={d.scanPlaceholder}
          inputMode="numeric"
          autoComplete="off"
          className={`${inputClass} ${big ? "min-h-14 text-xl" : ""}`}
        />
        <Button type="submit" size={btn}>
          {d.find}
        </Button>
      </form>

      {!lists ? (
        <p className="text-muted">{t.common.loading}</p>
      ) : (
        <>
          <Section big={big} title={d.pending} items={lists.pending.filter((p) => match(p) && p.id !== door?.parcel.id)} hideEmpty>
            {(p) => (
              <>
                <Button size={btn} disabled={busy} onClick={() => act(p, "placed")}>
                  {d.placed}
                </Button>
                {p.size !== "L" && (
                  <Button size={btn} variant="secondary" disabled={busy} onClick={() => act(p, "bigger")}>
                    {d.bigger}
                  </Button>
                )}
              </>
            )}
          </Section>

          <Section big={big} title={d.unload} items={lists.unload.filter(match)}>
            {(p) => (
              <>
                <Button size={btn} disabled={busy || !!door} onClick={() => act(p, "unload", { mode: "LOCKER" })}>
                  {d.toLocker}
                </Button>
                {hasCounter && (
                  <Button size={btn} variant="secondary" disabled={busy || !!door} onClick={() => act(p, "unload", { mode: "COUNTER" })}>
                    {d.toCounter}
                  </Button>
                )}
              </>
            )}
          </Section>

          <Section big={big} title={d.load} items={lists.load.filter(match)}>
            {(p) => (
              <Button size={btn} disabled={busy || !!door} onClick={() => act(p, "load")}>
                {d.take}
              </Button>
            )}
          </Section>

          <Section big={big} title={d.expired} items={lists.expired.filter(match)} hideEmpty>
            {(p) => (
              <Button size={btn} variant="danger" disabled={busy || !!door} onClick={() => act(p, "remove")}>
                {d.remove}
              </Button>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  children,
  hideEmpty,
  big,
}: {
  title: string;
  items: SlimParcel[];
  children: (p: SlimParcel) => React.ReactNode;
  hideEmpty?: boolean;
  big: boolean;
}) {
  const { lang, t } = useI18n();
  const d = t.staff.driver;
  if (hideEmpty && items.length === 0) return null;
  return (
    <section>
      <h2 className={`mb-3 flex items-center gap-2 font-bold ${big ? "text-2xl" : "text-xl"}`}>
        {title}
        <span className="rounded-full bg-brand px-2.5 text-base text-white">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-[var(--radius-std)] border border-dashed border-line bg-white p-4 text-muted">{d.nothing}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-[var(--radius-std)] border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex flex-wrap items-center gap-2">
                  <ShortNo n={p.shortNumber} />
                  <DeliveryTag type={p.deliveryType} />
                  <span className="font-mono text-sm text-muted">{p.trackingNumber}</span>
                </p>
                <p className="text-sm text-muted">
                  {t.sizes[p.size]} ({p.size}) · {p.recipientName}
                  {p.lockerNumber !== null ? ` · ${t.staff.admin.locker} ${p.lockerNumber}` : p.status === "AT_ORIGIN" ? ` · ${d.atCounter}` : ""}
                  {p.status === "EXPIRED" && p.pickupDeadline ? ` · ${formatDateTime(p.pickupDeadline, lang)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">{children(p)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
