"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LockerSize } from "@/db/schema";
import { errorMessage, fmt, formatPrice, formatTime, stationName } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "../I18nProvider";
import { LangSwitch } from "../LangSwitch";
import { QrClient } from "../QrClient";
import { SendForm, type CreatedParcel, type StationOption } from "../SendForm";
import { DriverPanel } from "../staff/DriverPanel";
import { Alert, Button, Code } from "../ui";
import { Keypad } from "./Keypad";
import { LockerMap } from "./LockerMap";

type KioskStation = StationOption & { hasCounter: boolean };

type Screen =
  | { name: "home" }
  | { name: "pickup" }
  | { name: "dropoff" }
  | { name: "send" }
  | { name: "pay"; parcel: CreatedParcel }
  | { name: "sent"; parcel: CreatedParcel; dropoffCode: string; pickupPin: string }
  | { name: "opened"; kind: "pickup" | "dropoff"; lockerNumber: number; trackingNumber: string; parcelId?: string }
  | { name: "thanks"; text: string }
  | { name: "notFit" }
  | { name: "staffPin" }
  | { name: "staff"; staffName: string }
  | { name: "unregistered" };

const IDLE_MS = { default: 60_000, opened: 90_000, staff: 120_000 };

export function KioskApp({
  station,
  stations,
  lockers,
  phoneQr,
  origin,
}: {
  station: KioskStation;
  stations: StationOption[];
  lockers: { number: number; size: LockerSize }[];
  phoneQr: React.ReactNode;
  origin: string;
}) {
  const { lang, t } = useI18n();
  const k = t.kiosk;
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The clock renders only in the browser so server and client HTML match.
  const [now, setNow] = useState<Date | null>(null);
  const lastActivity = useRef(Date.now());

  const go = useCallback((next: Screen) => {
    setScreen(next);
    setCode("");
    setError(null);
    lastActivity.current = Date.now();
  }, []);

  const reset = useCallback(async () => {
    if (screen.name === "staff") await api("/api/staff/logout", {}).catch(() => {});
    go({ name: "home" });
    // Next person starts in Macedonian.
    if (lang !== "mk") {
      await api("/api/lang", { lang: "mk" }).catch(() => {});
      router.refresh();
    }
  }, [go, lang, router, screen.name]);

  // Clock + inactivity reset.
  useEffect(() => {
    setNow(new Date());
    const mark = () => (lastActivity.current = Date.now());
    window.addEventListener("pointerdown", mark);
    window.addEventListener("keydown", mark);
    const timer = setInterval(() => {
      setNow(new Date());
      if (screen.name === "home" || screen.name === "unregistered") return;
      const limit = screen.name === "opened" ? IDLE_MS.opened : screen.name === "staff" ? IDLE_MS.staff : IDLE_MS.default;
      if (Date.now() - lastActivity.current > limit) reset();
    }, 5_000);
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      clearInterval(timer);
    };
  }, [screen.name, reset]);

  // "Thank you" screens go back to the start by themselves.
  useEffect(() => {
    if (screen.name !== "thanks") return;
    const timer = setTimeout(() => go({ name: "home" }), 6_000);
    return () => clearTimeout(timer);
  }, [screen, go]);

  function showError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.code === "KIOSK_NOT_REGISTERED") return go({ name: "unregistered" });
      if (err.code === "KEYPAD_LOCKED" && typeof err.details.lockedUntil === "string") {
        return setError(`${t.errors.KEYPAD_LOCKED} ${fmt(k.lockedFor, { time: formatTime(err.details.lockedUntil) })}`);
      }
      return setError(errorMessage(t, err.code, err.details));
    }
    setError(t.common.genericError);
  }

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      showError(err);
      setCode("");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function pickup(body: { pin: string } | { scan: string }) {
    const res = await run(() => api<{ lockerNumber: number; trackingNumber: string }>("/api/kiosk/pickup", body));
    if (res) go({ name: "opened", kind: "pickup", ...res });
  }

  async function dropoff(dropoffCode: string) {
    const res = await run(() => api<{ lockerNumber: number; trackingNumber: string; parcelId: string }>("/api/kiosk/dropoff", { code: dropoffCode }));
    if (res) go({ name: "opened", kind: "dropoff", ...res });
  }

  async function closedDoor() {
    if (screen.name !== "opened") return;
    await api("/api/kiosk/door", { lockerNumber: screen.lockerNumber }).catch(() => {});
    go({ name: "thanks", text: screen.kind === "dropoff" ? fmt(k.dropoffDone, { tracking: screen.trackingNumber }) : k.pickupDone });
  }

  async function doesNotFit() {
    if (screen.name !== "opened" || !screen.parcelId) return;
    const parcelId = screen.parcelId;
    const res = await run(() => api("/api/kiosk/dropoff/cancel", { parcelId }));
    if (res) go({ name: "notFit" });
  }

  async function pay() {
    if (screen.name !== "pay") return;
    const parcel = screen.parcel;
    const res = await run(() => api<{ dropoffCode: string; pickupPin: string }>(`/api/parcels/${parcel.senderToken}/pay`, {}));
    if (res) go({ name: "sent", parcel, dropoffCode: res.dropoffCode, pickupPin: res.pickupPin });
  }

  async function staffLogin(pin: string) {
    const res = await run(() => api<{ name: string }>("/api/kiosk/staff-login", { pin }));
    if (res) go({ name: "staff", staffName: res.name });
  }

  // Barcode/QR scanner = a USB "keyboard" that types fast and ends with Enter.
  useEffect(() => {
    if (screen.name !== "home" && screen.name !== "pickup") return;
    let buffer = "";
    let last = 0;
    function onKey(e: KeyboardEvent) {
      const t0 = performance.now();
      if (t0 - last > 80) buffer = "";
      last = t0;
      if (e.key === "Enter") {
        if (buffer.length >= 16) pickup({ scan: buffer });
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.name]);

  const title = (text: string) => <h1 className="text-center text-5xl font-extrabold">{text}</h1>;
  const back = (
    <Button variant="secondary" size="xl" onClick={() => go({ name: "home" })} disabled={busy}>
      {t.common.back}
    </Button>
  );

  return (
    <div className="flex h-dvh select-none flex-col overflow-hidden bg-surface-alt">
      <header className="flex items-center justify-between border-b border-line bg-white px-8 py-4">
        <div className="flex items-baseline gap-4">
          <span className="text-3xl font-extrabold text-brand">{stationName(station, lang)}</span>
          <span className="text-xl text-muted portrait:hidden">{t.common.tagline}</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="min-w-24 font-mono text-3xl font-bold text-ink">{now ? formatTime(now) : ""}</span>
          <LangSwitch large />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center overflow-y-auto p-8">
        {/* my-auto centres short screens without clipping tall ones. */}
        <div className="my-auto flex w-full flex-col items-center">
        {error && (
          <Alert tone="danger" className="mb-6 w-full max-w-3xl text-center text-2xl">
            {error}
          </Alert>
        )}

        {screen.name === "home" && (
          <div className="grid w-full max-w-6xl gap-8 landscape:grid-cols-[2fr_1fr]">
            <div className="flex flex-col gap-5">
              <h1 className="text-5xl font-extrabold">{k.welcome}</h1>
              <BigChoice onClick={() => go({ name: "pickup" })} title={k.pickup} hint={k.pickupHint} icon="📦" primary />
              <BigChoice onClick={() => go({ name: "dropoff" })} title={k.dropoff} hint={k.dropoffHint} icon="⬇️" />
              <BigChoice onClick={() => go({ name: "send" })} title={k.send} hint={k.sendHint} icon="💳" />
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-line bg-white p-6 text-center">
              {phoneQr}
              <p className="text-xl font-semibold text-ink">{k.scanToPhone}</p>
            </div>
          </div>
        )}

        {screen.name === "pickup" && (
          <div className="flex flex-col items-center gap-8">
            {title(k.enterPin)}
            <p className="text-2xl text-muted">{k.orScan}</p>
            <Keypad length={4} value={code} onChange={setCode} onSubmit={(pin) => pickup({ pin })} disabled={busy} label={k.enterPin} />
            {back}
          </div>
        )}

        {screen.name === "dropoff" && (
          <div className="flex flex-col items-center gap-8">
            {title(k.enterDropoff)}
            <Keypad length={6} value={code} onChange={setCode} onSubmit={dropoff} disabled={busy} label={k.enterDropoff} />
            {back}
          </div>
        )}

        {screen.name === "send" && (
          <div className="w-full max-w-4xl">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-4xl font-extrabold">{k.send}</h1>
              <Button variant="ghost" size="lg" onClick={() => go({ name: "home" })}>
                {t.common.cancel}
              </Button>
            </div>
            <SendForm stations={stations} mode="kiosk" fixedOriginId={station.id} onCreated={(parcel) => go({ name: "pay", parcel })} />
          </div>
        )}

        {screen.name === "pay" && (
          <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
            {title(t.pay.title)}
            <p className="text-6xl font-extrabold text-brand">{formatPrice(screen.parcel.priceDenars, lang)}</p>
            <p className="text-3xl font-semibold">💳 {t.pay.kioskInsertCard}</p>
            <Alert tone="warning" className="text-lg">
              {t.pay.testMode}
            </Alert>
            <div className="flex gap-4">
              <Button variant="secondary" size="xl" onClick={() => go({ name: "home" })} disabled={busy}>
                {t.common.cancel}
              </Button>
              <Button size="xl" onClick={pay} disabled={busy}>
                {busy ? t.pay.processing : t.pay.kioskSimulate}
              </Button>
            </div>
          </div>
        )}

        {screen.name === "sent" && (
          <div className="grid w-full max-w-5xl gap-8 landscape:grid-cols-[3fr_2fr]">
            <div className="flex flex-col gap-6">
              <h1 className="text-5xl font-extrabold">{t.sender.paidTitle}</h1>
              <div>
                <p className="text-xl font-semibold uppercase tracking-wide text-muted">{t.sender.trackingNumber}</p>
                <Code value={screen.parcel.trackingNumber} size="xl" />
              </div>
              <div className="rounded-[var(--radius-card)] border-4 border-accent bg-accent-soft p-5">
                <p className="text-xl font-semibold uppercase tracking-wide text-muted">{t.sender.pinTitle}</p>
                <Code value={screen.pickupPin} size="xl" />
                <p className="mt-2 text-xl">{fmt(t.sender.pinHelp, { station: stationName(stations.find((s) => s.id === screen.parcel.destinationStationId) ?? station, lang) })}</p>
              </div>
              <p className="text-lg text-muted">
                {t.sender.dropoffCode}: <span className="font-mono font-bold text-ink">{screen.dropoffCode}</span>
              </p>
              <Button size="xl" onClick={() => dropoff(screen.dropoffCode)} disabled={busy}>
                {t.sender.leaveNow}
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-line bg-white p-6 text-center">
              <QrClient value={`${origin}/p/${screen.parcel.senderToken}`} label={k.scanToKeep} className="h-64 w-64" />
              <p className="text-xl font-semibold">{k.scanToKeep}</p>
            </div>
          </div>
        )}

        {screen.name === "opened" && (
          <div className="flex flex-col items-center gap-8 text-center">
            <h1 className="text-7xl font-extrabold text-brand">{fmt(k.opened, { n: screen.lockerNumber })}</h1>
            <p className="text-3xl">{screen.kind === "pickup" ? k.takeParcel : k.putParcel}</p>
            <LockerMap lockers={lockers} open={screen.lockerNumber} />
            <div className="flex gap-4">
              {screen.kind === "dropoff" && (
                <Button variant="secondary" size="xl" onClick={doesNotFit} disabled={busy}>
                  {k.doesNotFit}
                </Button>
              )}
              <Button size="xl" onClick={closedDoor} disabled={busy}>
                {k.closedDoor}
              </Button>
            </div>
          </div>
        )}

        {screen.name === "thanks" && (
          <div className="flex flex-col items-center gap-8 text-center">
            <span className="text-8xl" aria-hidden="true">
              ✅
            </span>
            <h1 className="max-w-3xl text-5xl font-extrabold">{screen.text}</h1>
            <Button size="xl" onClick={() => go({ name: "home" })}>
              {k.backToStart}
            </Button>
          </div>
        )}

        {screen.name === "notFit" && (
          <div className="flex max-w-3xl flex-col items-center gap-8 text-center">
            <h1 className="text-5xl font-extrabold">{k.doesNotFit}</h1>
            <p className="text-2xl">{k.doesNotFitHelp}</p>
            <Button size="xl" onClick={() => go({ name: "home" })}>
              {k.backToStart}
            </Button>
          </div>
        )}

        {screen.name === "staffPin" && (
          <div className="flex flex-col items-center gap-8">
            {title(k.servicePin)}
            <Keypad length={6} value={code} onChange={setCode} onSubmit={staffLogin} disabled={busy} label={k.servicePin} />
            {back}
          </div>
        )}

        {screen.name === "staff" && (
          <div className="w-full max-w-5xl">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-4xl font-extrabold">
                {t.staff.driver.title}: {screen.staffName}
              </h1>
              <Button variant="danger" size="lg" onClick={reset}>
                {k.staffExit}
              </Button>
            </div>
            <DriverPanel stationId={station.id} hasCounter={station.hasCounter} big />
          </div>
        )}

        {screen.name === "unregistered" && (
          <div className="flex max-w-2xl flex-col gap-4 text-center">
            <h1 className="text-5xl font-extrabold">{k.notRegisteredTitle}</h1>
            <p className="text-2xl">{k.notRegisteredText}</p>
          </div>
        )}
        </div>
      </main>

      {screen.name === "home" && (
        <footer className="flex justify-end px-8 pb-4">
          <button type="button" onClick={() => go({ name: "staffPin" })} className="min-h-12 rounded-[var(--radius-std)] px-4 text-lg font-semibold text-muted hover:bg-white">
            🔧 {k.staff}
          </button>
        </footer>
      )}
    </div>
  );
}

function BigChoice({ title, hint, icon, onClick, primary }: { title: string; hint: string; icon: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-32 portrait:min-h-44 items-center gap-6 rounded-[var(--radius-card)] px-8 py-6 text-left shadow-sm transition active:scale-[0.99] ${
        primary ? "bg-brand text-white hover:bg-brand-hover" : "border-2 border-line bg-white text-ink hover:border-brand"
      }`}
    >
      <span className="text-6xl" aria-hidden="true">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-4xl font-extrabold">{title}</span>
        <span className={`text-2xl ${primary ? "text-white/85" : "text-muted"}`}>{hint}</span>
      </span>
    </button>
  );
}
