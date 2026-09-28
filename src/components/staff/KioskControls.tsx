"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "../I18nProvider";
import { Button } from "../ui";

export function KioskControls({ stationId, stationCode, activateLabel, revokeLabel }: { stationId: string; stationCode: string; activateLabel: string; revokeLabel: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await api("/api/staff/kiosk", { stationId, action: "activate" });
          router.push(`/kiosk/${stationCode}`);
        }}
      >
        {activateLabel}
      </Button>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          if (!confirm(`${revokeLabel}?`)) return;
          setBusy(true);
          await api("/api/staff/kiosk", { stationId, action: "revoke" });
          setBusy(false);
          router.refresh();
        }}
      >
        {revokeLabel}
      </Button>
      <span className="sr-only">{t.staff.admin.kiosks}</span>
    </div>
  );
}
