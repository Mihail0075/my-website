"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { Alert, Button, Field, Input } from "@/components/ui";
import { errorMessage, fmt } from "@/i18n";
import { api, ApiError } from "@/lib/api";

/** Stand-in for the bank's card page until a real payment gateway is connected. */
export function PayForm({ token, priceLabel }: { token: string; priceLabel: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/parcels/${token}/pay`, {});
      router.push(`/p/${token}`);
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code) : t.common.genericError);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-4">
      <Alert tone="warning">{t.pay.testMode}</Alert>
      <Field label={t.pay.cardNumber} htmlFor="card">
        <Input id="card" inputMode="numeric" autoComplete="off" defaultValue="4242 4242 4242 4242" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t.pay.expiry} htmlFor="exp">
          <Input id="exp" autoComplete="off" defaultValue="12/30" />
        </Field>
        <Field label={t.pay.cvc} htmlFor="cvc">
          <Input id="cvc" inputMode="numeric" autoComplete="off" defaultValue="123" />
        </Field>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? t.pay.processing : fmt(t.pay.payNow, { price: priceLabel })}
      </Button>
    </form>
  );
}
