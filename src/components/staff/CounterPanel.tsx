"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, fmt, formatDateTime } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { DeliveryFilterTabs, DeliveryTag, type DeliveryFilter } from "../DeliveryTag";
import { useI18n } from "../I18nProvider";
import { SendForm, type CreatedParcel, type StationOption } from "../SendForm";
import { StatusBadge } from "../StatusBadge";
import { Alert, Button, ButtonLink, Card, Code, inputClass, ShortNo } from "../ui";
import type { SlimParcel } from "./DriverPanel";

type Lists = { waitingDriver: SlimParcel[]; forPickup: SlimParcel[] };

/** Counter screen: accept parcels (cash or card) and hand over parcels that wait at the counter. */
export function CounterPanel({ stationId, stations }: { stationId: string; stations: StationOption[] }) {
  const { lang, t } = useI18n();
  const c = t.staff.counter;
  const [lists, setLists] = useState<Lists | null>(null);
  const [created, setCreated] = useState<CreatedParcel | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [kind, setKind] = useState<DeliveryFilter>("ALL");
  const byKind = (p: SlimParcel) => kind === "ALL" || p.deliveryType === kind;
  const forPickup = lists?.forPickup.filter(byKind) ?? [];
  const waitingDriver = lists?.waitingDriver.filter(byKind) ?? [];
  const [handover, setHandover] = useState<{ id: string; pin: string } | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLists(await api<Lists>(`/api/staff/lists?station=${stationId}&kind=counter`));
    } catch {}
  }, [stationId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  async function doHandover(e: React.FormEvent) {
    e.preventDefault();
    if (!handover) return;
    setMessage(null);
    try {
      await api(`/api/staff/parcels/${handover.id}/handover`, { stationId, pin: handover.pin });
      setHandover(null);
      setMessage({ tone: "success", text: c.handedOver });
      load();
    } catch (err) {
      setMessage({ tone: "danger", text: err instanceof ApiError ? errorMessage(t, err.code, err.details) : t.common.genericError });
      setHandover({ ...handover, pin: "" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>
        <h2 className="mb-4 text-2xl font-bold">{c.newParcel}</h2>
        {created ? (
          <div className="flex flex-col gap-4">
            <Alert tone="success">{fmt(c.created, { tracking: created.trackingNumber })}</Alert>
            <div className="flex items-center gap-3">
              <ShortNo n={created.shortNumber} size="xl" />
              <span className="text-muted">{t.staff.counter.writeOnParcel}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t.sender.trackingNumber}</p>
                <Code value={created.trackingNumber} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t.sender.pinTitle}</p>
                <Code value={created.pickupPin ?? ""} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/staff/label/${created.id}`} target="_blank" size="lg">
                🖨 {c.printLabel}
              </ButtonLink>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setCreated(null);
                  setFormKey((k) => k + 1);
                }}
              >
                + {c.newParcel}
              </Button>
            </div>
          </div>
        ) : (
          <SendForm
            key={formKey}
            stations={stations}
            mode="counter"
            fixedOriginId={stationId}
            onCreated={(p) => {
              setCreated(p);
              load();
            }}
          />
        )}
      </Card>

      <div className="flex flex-col gap-6">
        <DeliveryFilterTabs value={kind} onChange={setKind} />
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <Card>
          <h2 className="mb-3 text-xl font-bold">{c.readyAtCounter}</h2>
          {!lists ? (
            <p className="text-muted">{t.common.loading}</p>
          ) : forPickup.length === 0 ? (
            <p className="text-muted">{t.staff.driver.nothing}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {forPickup.map((p) => (
                <li key={p.id} className="rounded-[var(--radius-std)] border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="flex flex-wrap items-center gap-2"><ShortNo n={p.shortNumber} /> <DeliveryTag type={p.deliveryType} /> <span className="font-mono text-sm text-muted">{p.trackingNumber}</span></p>
                      <p className="text-sm text-muted">
                        {p.recipientName} · {p.lockerNumber !== null ? `${t.staff.admin.locker} ${p.lockerNumber}` : t.staff.driver.atCounter}
                        {p.pickupDeadline ? ` · ${formatDateTime(p.pickupDeadline, lang)}` : ""}
                      </p>
                    </div>
                    {p.status === "EXPIRED" ? <StatusBadge status={p.status} /> : null}
                    {handover?.id !== p.id && (
                      <Button onClick={() => setHandover({ id: p.id, pin: "" })}>{c.handover}</Button>
                    )}
                  </div>
                  {handover?.id === p.id && (
                    <form onSubmit={doHandover} className="mt-3 flex gap-2">
                      <label htmlFor={`pin-${p.id}`} className="sr-only">
                        {c.pinPrompt}
                      </label>
                      <input
                        id={`pin-${p.id}`}
                        value={handover.pin}
                        onChange={(e) => setHandover({ id: p.id, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        placeholder={c.pinPrompt}
                        className={`${inputClass} max-w-40 font-mono text-xl tracking-widest`}
                      />
                      <Button type="submit" disabled={handover.pin.length !== 4}>
                        {t.common.confirm}
                      </Button>
                      <Button variant="ghost" onClick={() => setHandover(null)}>
                        {t.common.cancel}
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-xl font-bold">{c.waitingDriver}</h2>
          {!lists ? (
            <p className="text-muted">{t.common.loading}</p>
          ) : waitingDriver.length === 0 ? (
            <p className="text-muted">{t.staff.driver.nothing}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {waitingDriver.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-std)] border border-line p-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2"><ShortNo n={p.shortNumber} /> <DeliveryTag type={p.deliveryType} /> <span className="font-mono text-sm text-muted">{p.trackingNumber}</span></p>
                    <p className="text-sm text-muted">
                      {t.sizes[p.size]} ({p.size}) · {p.lockerNumber !== null ? `${t.staff.admin.locker} ${p.lockerNumber}` : t.staff.driver.atCounter}
                    </p>
                  </div>
                  <ButtonLink href={`/staff/label/${p.id}`} target="_blank" variant="ghost">
                    🖨
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
