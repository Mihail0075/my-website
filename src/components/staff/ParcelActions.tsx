"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ParcelStatus } from "@/db/schema";
import { errorMessage } from "@/i18n";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "../I18nProvider";
import { Alert, Button, ButtonLink } from "../ui";

export function ParcelActions({ id, status }: { id: string; status: ParcelStatus }) {
  const { t } = useI18n();
  const a = t.staff.admin;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: string) {
    if (action === "cancel" && !confirm(`${a.cancel}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/staff/parcels/${id}/${action}`, {});
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code) : t.common.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/staff/label/${id}`} target="_blank" variant="secondary">
          🖨 {t.staff.counter.printLabel}
        </ButtonLink>
        {(status === "READY_FOR_PICKUP" || status === "EXPIRED") && (
          <Button disabled={busy} onClick={() => run("extend")}>
            {a.extend}
          </Button>
        )}
        {["AWAITING_PAYMENT", "AWAITING_DROPOFF", "AT_ORIGIN"].includes(status) && (
          <Button variant="danger" disabled={busy} onClick={() => run("cancel")}>
            {a.cancel}
          </Button>
        )}
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
