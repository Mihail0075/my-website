"use client";

import { useState } from "react";
import { useI18n } from "./I18nProvider";
import { buttonClass } from "./ui";

/** Lets the sender forward the PIN themselves — free, no SMS provider needed. */
export function ShareButtons({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(text);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`viber://forward?text=${encoded}`} className={buttonClass("primary", "md", "bg-[#665cac] hover:bg-[#574e96]")}>
        {t.sender.shareViber}
      </a>
      <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
        {t.sender.shareWhatsApp}
      </a>
      <a href={`sms:?&body=${encoded}`} className={buttonClass("secondary", "md")}>
        {t.sender.shareSms}
      </a>
      <button type="button" onClick={copy} className={buttonClass("ghost", "md")} aria-live="polite">
        {copied ? t.common.copied : t.common.copy}
      </button>
    </div>
  );
}
