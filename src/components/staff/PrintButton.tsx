"use client";

import { useI18n } from "../I18nProvider";
import { Button } from "../ui";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <Button size="lg" className="no-print" onClick={() => window.print()}>
      🖨 {t.common.print}
    </Button>
  );
}
