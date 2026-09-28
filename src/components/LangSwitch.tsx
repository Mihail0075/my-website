"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getDictFor, LANGS, type Lang } from "@/i18n";
import { api } from "@/lib/api";
import { useI18n } from "./I18nProvider";

/** Shows each language in its own name; keeps the user on the same page. */
export function LangSwitch({ className = "", large = false }: { className?: string; large?: boolean }) {
  const { lang } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: Lang) {
    if (next === lang) return;
    start(async () => {
      await api("/api/lang", { lang: next });
      router.refresh();
    });
  }

  return (
    <div className={`inline-flex rounded-full border border-line bg-white p-1 ${className}`} role="group" aria-label="Language / Јазик">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          disabled={pending}
          onClick={() => choose(l)}
          aria-pressed={l === lang}
          className={`rounded-full font-semibold transition-colors ${large ? "min-h-14 px-6 text-xl" : "min-h-9 px-3 text-sm"} ${
            l === lang ? "bg-brand text-white" : "text-muted hover:text-ink"
          }`}
        >
          {getDictFor(l).langName}
        </button>
      ))}
    </div>
  );
}
