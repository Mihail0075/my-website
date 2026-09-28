"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useI18n } from "../I18nProvider";

export function LogoutButton() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await api("/api/staff/logout", {}).catch(() => {});
        router.push("/staff/login");
        router.refresh();
      }}
      className="min-h-11 rounded-[var(--radius-std)] px-3 font-semibold text-muted hover:bg-surface-alt hover:text-ink"
    >
      {t.common.logout}
    </button>
  );
}
