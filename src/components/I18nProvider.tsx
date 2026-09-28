"use client";

import { createContext, useContext } from "react";
import type { Dict, Lang } from "@/i18n";

const I18nContext = createContext<{ lang: Lang; t: Dict } | null>(null);

export function I18nProvider({ lang, t, children }: { lang: Lang; t: Dict; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
