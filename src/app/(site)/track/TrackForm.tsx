"use client";

import { useI18n } from "@/components/I18nProvider";
import { Button, inputClass } from "@/components/ui";

export function TrackForm({ initial = "" }: { initial?: string }) {
  const { t } = useI18n();
  return (
    <form action="/track" method="get" className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="n" className="sr-only">
        {t.track.placeholder}
      </label>
      <input id="n" name="n" defaultValue={initial} inputMode="numeric" autoComplete="off" required placeholder={t.track.placeholder} className={inputClass} />
      <Button type="submit" size="md" className="min-h-12">
        {t.common.search}
      </Button>
    </form>
  );
}
