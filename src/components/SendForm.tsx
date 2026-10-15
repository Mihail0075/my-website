"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LockerSize } from "@/db/schema";
import { fmt, formatPrice, stationName } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { calcPrice, LOCKER_DIMENSIONS, MAX_WEIGHT_KG, SIZES } from "@/lib/config";
import { looksLikeEmail, normalizePhone } from "@/lib/phone";
import { useI18n } from "./I18nProvider";
import { SizeIcon } from "./SizeIcon";
import { Alert, Button, Field, inputClass, inputClassBig } from "./ui";

export type StationOption = { id: string; code: string; nameMk: string; nameEn: string };

type Mode = "online" | "kiosk" | "counter";

type FormState = {
  originStationId: string;
  destinationStationId: string;
  size: LockerSize;
  weightKg: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  deliveryType: "LOCKER" | "COURIER";
  deliveryAddress: string;
  note: string;
};

type Errors = Partial<Record<keyof FormState | "consent" | "payment", string>>;

export type CreatedParcel = { senderToken: string; trackingNumber: string; shortNumber: number; priceDenars: number; destinationStationId: string; id?: string; pickupPin?: string };

const STEP_FIELDS: (keyof FormState)[][] = [
  ["originStationId", "destinationStationId", "size", "weightKg"],
  ["senderName", "senderPhone", "senderEmail"],
  ["recipientName", "recipientPhone", "recipientEmail", "deliveryType", "deliveryAddress", "note"],
  [],
];

const STORAGE_KEY = "send-form-v1";

export function SendForm({
  stations,
  mode,
  fixedOriginId,
  defaultOriginId,
  onCreated,
}: {
  stations: StationOption[];
  mode: Mode;
  /** Kiosk and counter always send from their own station. */
  fixedOriginId?: string;
  defaultOriginId?: string;
  onCreated: (parcel: CreatedParcel) => void;
}) {
  const { lang, t } = useI18n();
  const uid = useId();
  const big = mode === "kiosk";
  const fieldCls = big ? inputClassBig : inputClass;
  const origin0 = fixedOriginId ?? defaultOriginId ?? stations[0]?.id ?? "";
  const otherThan = (id: string) => stations.find((s) => s.id !== id)?.id ?? "";

  const [form, setForm] = useState<FormState>(() => ({
    originStationId: origin0,
    destinationStationId: otherThan(origin0),
    size: "S",
    weightKg: "",
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    recipientName: "",
    recipientPhone: "",
    recipientEmail: "",
    deliveryType: "LOCKER",
    deliveryAddress: "",
    note: "",
  }));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [consent, setConsent] = useState(false);
  const [payment, setPayment] = useState<"CASH" | "CARD_POS" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Online only: survive an accidental reload on the phone (this tab only; cleared after sending).
  useEffect(() => {
    if (mode !== "online") return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setForm((f) => ({ ...f, ...JSON.parse(saved), originStationId: f.originStationId, destinationStationId: f.destinationStationId }));
    } catch {}
  }, [mode]);
  useEffect(() => {
    if (mode !== "online") return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form, mode]);

  const weight = Number(form.weightKg.replace(",", "."));
  const price = useMemo(() => (weight > 0 && weight <= MAX_WEIGHT_KG ? calcPrice(form.size, weight) : null), [form.size, weight]);
  const stationById = (id: string) => stations.find((s) => s.id === id);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // With two stations the destination is simply "the other one".
      if (key === "originStationId" && next.destinationStationId === value) next.destinationStationId = otherThan(value as string);
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(stepIndex: number): Errors {
    const e: Errors = {};
    const req = (k: keyof FormState) => {
      if (!String(form[k]).trim()) e[k] = t.send.errors.required;
    };
    if (stepIndex === 0) {
      if (!(weight >= 0.1 && weight <= MAX_WEIGHT_KG)) e.weightKg = fmt(t.send.errors.weight, { max: MAX_WEIGHT_KG });
      if (form.originStationId === form.destinationStationId) e.destinationStationId = t.errors.SAME_STATION;
    }
    if (stepIndex === 1) {
      req("senderName");
      if (!normalizePhone(form.senderPhone)) e.senderPhone = t.send.errors.phone;
      if (form.senderEmail.trim() && !looksLikeEmail(form.senderEmail)) e.senderEmail = t.send.errors.email;
      if (mode === "online" && !form.senderEmail.trim()) e.senderEmail = t.send.errors.email_or_phone;
    }
    if (stepIndex === 2) {
      req("recipientName");
      if (!normalizePhone(form.recipientPhone)) e.recipientPhone = t.send.errors.phone;
      if (form.recipientEmail.trim() && !looksLikeEmail(form.recipientEmail)) e.recipientEmail = t.send.errors.email;
      if (form.deliveryType === "COURIER") req("deliveryAddress");
    }
    if (stepIndex === 3) {
      if (mode !== "counter" && !consent) e.consent = t.send.errors.consent;
      if (mode === "counter" && !payment) e.payment = t.send.errors.required;
    }
    return e;
  }

  function goTo(next: number) {
    setStep(next);
    setFormError(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length === 0) goTo(step + 1);
  }

  async function submit() {
    const e = validate(3);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const body = { ...form, weightKg: weight, lang, via: mode === "kiosk" ? "KIOSK" : undefined, payment: payment || undefined };
      const created = await api<CreatedParcel>(mode === "counter" ? "/api/staff/parcels" : "/api/parcels", body);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION" && err.details.fields) {
        const fields = err.details.fields as Record<string, string>;
        const mapped: Errors = {};
        for (const [k, v] of Object.entries(fields)) {
          mapped[k as keyof FormState] = (t.send.errors as Record<string, string>)[v] ?? t.errors.VALIDATION;
        }
        setErrors(mapped);
        const firstStep = STEP_FIELDS.findIndex((fs) => fs.some((f) => f in mapped));
        if (firstStep >= 0) goTo(firstStep);
        setFormError(t.errors.VALIDATION);
      } else {
        setFormError(err instanceof ApiError ? (t.errors[err.code as keyof typeof t.errors] ?? t.common.genericError) : t.common.genericError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const input = (key: keyof FormState, props: React.ComponentProps<"input"> = {}) => (
    <input
      id={`${uid}-${key}`}
      value={form[key] as string}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={!!errors[key]}
      aria-describedby={errors[key] ? `${uid}-${key}-error` : undefined}
      className={fieldCls}
      {...props}
    />
  );

  const labelCls = big ? "text-xl" : "";
  const btnSize = big ? "xl" : "lg";

  return (
    <div className="flex flex-col gap-6">
      {/* Named step list: the user always sees how much is left. */}
      <ol className="grid grid-cols-4 gap-2" aria-label={fmt(t.send.stepOf, { n: step + 1, total: 4 })}>
        {t.send.steps.map((name, i) => (
          <li key={name} aria-current={i === step ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
            <span className={`text-xs font-semibold sm:text-sm ${big ? "text-base sm:text-lg" : ""} ${i === step ? "text-ink" : "text-muted"}`}>{name}</span>
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className={`font-bold outline-none ${big ? "text-4xl" : "text-2xl"}`}>
        {step === 0 && t.send.parcel}
        {step === 1 && t.send.senderTitle}
        {step === 2 && t.send.recipientTitle}
        {step === 3 && t.send.review}
      </h2>

      {formError && <Alert tone="danger">{formError}</Alert>}

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={<span className={labelCls}>{t.send.from}</span>} htmlFor={`${uid}-originStationId`}>
              <select
                id={`${uid}-originStationId`}
                value={form.originStationId}
                disabled={!!fixedOriginId}
                onChange={(e) => set("originStationId", e.target.value)}
                className={fieldCls}
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {stationName(s, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={<span className={labelCls}>{t.send.to}</span>} htmlFor={`${uid}-destinationStationId`} error={errors.destinationStationId}>
              <select
                id={`${uid}-destinationStationId`}
                value={form.destinationStationId}
                onChange={(e) => set("destinationStationId", e.target.value)}
                className={fieldCls}
              >
                {stations
                  .filter((s) => s.id !== form.originStationId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {stationName(s, lang)}
                    </option>
                  ))}
              </select>
            </Field>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className={`mb-1 font-semibold text-ink ${labelCls}`}>{t.send.size}</legend>
            <p className="text-sm text-muted">{t.send.sizeHelp}</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {SIZES.map((size) => {
                const checked = form.size === size;
                return (
                  <label
                    key={size}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-card)] border-2 p-3 text-center transition-colors ${
                      checked ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-field"
                    } ${big ? "p-5" : ""}`}
                  >
                    <input type="radio" name={`${uid}-size`} value={size} checked={checked} onChange={() => set("size", size)} className="sr-only" />
                    <SizeIcon size={size} />
                    <span className={`font-bold text-ink ${big ? "text-2xl" : "text-lg"}`}>{t.sizes[size]}</span>
                    <span className="text-xs text-muted sm:text-sm">{fmt(t.sizes.dims, LOCKER_DIMENSIONS[size])}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field
            label={<span className={labelCls}>{t.send.weight}</span>}
            htmlFor={`${uid}-weightKg`}
            help={fmt(t.send.weightHelp, { max: MAX_WEIGHT_KG })}
            error={errors.weightKg}
          >
            {input("weightKg", { inputMode: "decimal", autoComplete: "off", placeholder: "1.5", className: `${fieldCls} max-w-48` })}
          </Field>

          <PriceBox price={price} big={big} />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Field label={<span className={labelCls}>{t.send.name}</span>} htmlFor={`${uid}-senderName`} error={errors.senderName}>
            {input("senderName", { autoComplete: mode === "online" ? "name" : "off" })}
          </Field>
          <Field label={<span className={labelCls}>{t.send.phone}</span>} htmlFor={`${uid}-senderPhone`} help={t.send.phoneHelp} error={errors.senderPhone}>
            {input("senderPhone", { type: "tel", inputMode: "tel", autoComplete: mode === "online" ? "tel" : "off" })}
          </Field>
          <Field
            label={
              <span className={labelCls}>
                {t.send.email} {mode !== "online" && <span className="font-normal text-muted">({t.common.optional})</span>}
              </span>
            }
            htmlFor={`${uid}-senderEmail`}
            help={t.send.senderEmailHelp}
            error={errors.senderEmail}
          >
            {input("senderEmail", { type: "email", inputMode: "email", autoComplete: mode === "online" ? "email" : "off" })}
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Field label={<span className={labelCls}>{t.send.name}</span>} htmlFor={`${uid}-recipientName`} error={errors.recipientName}>
            {input("recipientName", { autoComplete: "off" })}
          </Field>
          <Field label={<span className={labelCls}>{t.send.phone}</span>} htmlFor={`${uid}-recipientPhone`} help={t.send.phoneHelp} error={errors.recipientPhone}>
            {input("recipientPhone", { type: "tel", inputMode: "tel", autoComplete: "off" })}
          </Field>
          <Field
            label={
              <span className={labelCls}>
                {t.send.email} <span className="font-normal text-muted">({t.common.optional})</span>
              </span>
            }
            htmlFor={`${uid}-recipientEmail`}
            help={t.send.recipientEmailHelp}
            error={errors.recipientEmail}
          >
            {input("recipientEmail", { type: "email", inputMode: "email", autoComplete: "off" })}
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className={`mb-1 font-semibold text-ink ${labelCls}`}>{t.send.deliveryType}</legend>
            {(["LOCKER", "COURIER"] as const).map((type) => (
              <label
                key={type}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--radius-std)] border-2 px-4 py-3 ${
                  form.deliveryType === type ? "border-brand bg-brand-soft" : "border-line bg-white"
                } ${big ? "text-xl" : ""}`}
              >
                <input type="radio" name={`${uid}-delivery`} checked={form.deliveryType === type} onChange={() => set("deliveryType", type)} className="h-5 w-5 accent-[#0b5d4b]" />
                <span className="font-medium text-ink">{t.delivery[type]}</span>
              </label>
            ))}
          </fieldset>
          {form.deliveryType === "COURIER" && (
            <>
              <p className="text-sm text-muted">{t.delivery.courierNote}</p>
              <Field label={<span className={labelCls}>{t.send.address}</span>} htmlFor={`${uid}-deliveryAddress`} error={errors.deliveryAddress}>
                {input("deliveryAddress", { autoComplete: "off" })}
              </Field>
            </>
          )}
          <Field
            label={
              <span className={labelCls}>
                {t.send.note} <span className="font-normal text-muted">({t.common.optional})</span>
              </span>
            }
            htmlFor={`${uid}-note`}
          >
            {input("note", { autoComplete: "off", maxLength: 300 })}
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <dl className={`grid gap-x-6 gap-y-4 rounded-[var(--radius-card)] border border-line bg-white p-4 sm:grid-cols-2 ${big ? "text-xl" : ""}`}>
            <ReviewItem label={t.send.route} onEdit={() => goTo(0)} editLabel={t.common.back}>
              {stationName(stationById(form.originStationId)!, lang)} → {stationName(stationById(form.destinationStationId)!, lang)}
            </ReviewItem>
            <ReviewItem label={t.send.parcel} onEdit={() => goTo(0)} editLabel={t.common.back}>
              {t.sizes[form.size]} ({form.size}), {weight} kg
            </ReviewItem>
            <ReviewItem label={t.send.senderTitle} onEdit={() => goTo(1)} editLabel={t.common.back}>
              {form.senderName}
              <br />
              {form.senderPhone}
              {form.senderEmail && (
                <>
                  <br />
                  {form.senderEmail}
                </>
              )}
            </ReviewItem>
            <ReviewItem label={t.send.recipientTitle} onEdit={() => goTo(2)} editLabel={t.common.back}>
              {form.recipientName}
              <br />
              {form.recipientPhone}
              <br />
              <span className="text-muted">{t.delivery[form.deliveryType]}</span>
              {form.deliveryType === "COURIER" && (
                <>
                  <br />
                  {form.deliveryAddress}
                </>
              )}
            </ReviewItem>
          </dl>

          <PriceBox price={price} big={big} />

          {mode === "counter" ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-semibold text-ink">{t.staff.counter.paymentMethod}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["CASH", "CARD_POS"] as const).map((m) => (
                  <label
                    key={m}
                    className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-std)] border-2 font-semibold ${
                      payment === m ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-ink"
                    }`}
                  >
                    <input type="radio" name={`${uid}-payment`} checked={payment === m} onChange={() => setPayment(m)} className="sr-only" />
                    {m === "CASH" ? t.staff.counter.cash : t.staff.counter.cardPos}
                  </label>
                ))}
              </div>
              {errors.payment && <p className="text-sm font-medium text-danger">{errors.payment}</p>}
            </fieldset>
          ) : (
            <div className="flex flex-col gap-1">
              <label className={`flex cursor-pointer items-start gap-3 ${big ? "text-xl" : ""}`}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setErrors((er) => ({ ...er, consent: undefined }));
                  }}
                  className={`mt-1 accent-[#0b5d4b] ${big ? "h-7 w-7" : "h-5 w-5"}`}
                  aria-invalid={!!errors.consent}
                />
                <span>{t.send.consent}</span>
              </label>
              {errors.consent && <p className="text-sm font-medium text-danger">{errors.consent}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <Button variant="secondary" size={btnSize} onClick={() => goTo(step - 1)} disabled={submitting}>
            {t.common.back}
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button size={btnSize} onClick={next}>
            {t.common.next}
          </Button>
        ) : (
          <Button size={btnSize} onClick={submit} disabled={submitting || price === null}>
            {submitting
              ? t.common.loading
              : price === null
                ? t.send.review
                : mode === "counter"
                  ? fmt(t.staff.counter.charge, { price: formatPrice(price, lang) })
                  : fmt(mode === "kiosk" ? t.send.payAtKiosk : t.send.pay, { price: formatPrice(price, lang) })}
          </Button>
        )}
      </div>
    </div>
  );
}

function PriceBox({ price, big }: { price: number | null; big: boolean }) {
  const { lang, t } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-brand-dark px-5 py-4 text-white" aria-live="polite">
      <div>
        <p className={`font-semibold ${big ? "text-xl" : ""}`}>{t.send.price}</p>
        <p className="text-sm text-white/80">{t.send.priceNote}</p>
      </div>
      <p className={`font-extrabold ${big ? "text-5xl" : "text-3xl"}`}>{price === null ? "—" : formatPrice(price, lang)}</p>
    </div>
  );
}

function ReviewItem({ label, children, onEdit, editLabel }: { label: string; children: React.ReactNode; onEdit: () => void; editLabel: string }) {
  return (
    <div>
      <dt className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-muted">
        {label}
        <button type="button" onClick={onEdit} className="min-h-9 rounded px-2 text-sm font-semibold normal-case tracking-normal text-brand hover:bg-brand-soft">
          ✎ <span className="sr-only">{editLabel}</span>
        </button>
      </dt>
      <dd className="mt-1 text-ink">{children}</dd>
    </div>
  );
}
