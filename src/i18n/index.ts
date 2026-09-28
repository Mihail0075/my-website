import { TIME_ZONE } from "@/lib/config";
import en from "./en";
import mk, { type Dict } from "./mk";

export type Lang = "mk" | "en";
export type { Dict };

export const LANGS: Lang[] = ["mk", "en"];
export const DEFAULT_LANG: Lang = "mk";
export const LANG_COOKIE = "lang";

const dicts: Record<Lang, Dict> = { mk, en };

export function isLang(value: unknown): value is Lang {
  return value === "mk" || value === "en";
}

export function getDictFor(lang: Lang): Dict {
  return dicts[lang];
}

/** Replace {name} placeholders. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}

/*
 * Formatting is done by hand on top of numeric Intl parts: browsers and Node
 * ship different ICU data (some Chromium builds have no Macedonian locale),
 * and server and client must render identical text.
 */
function groupThousands(n: number, sep: string): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export function formatPrice(denars: number, lang: Lang): string {
  return lang === "mk" ? `${groupThousands(denars, ".")} ден.` : `MKD ${groupThousands(denars, ",")}`;
}

function skopjeParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

/** 28.09.2026 14:05 (mk) or 28/09/2026 14:05 (en), always in Skopje time. */
export function formatDateTime(value: Date | string, lang: Lang): string {
  const p = skopjeParts(value);
  return lang === "mk" ? `${p.d}.${p.m}.${p.y} ${p.h}:${p.min}` : `${p.d}/${p.m}/${p.y} ${p.h}:${p.min}`;
}

export function formatTime(value: Date | string): string {
  const p = skopjeParts(value);
  return `${p.h}:${p.min}`;
}

export function formatWeight(grams: number, lang: Lang): string {
  const kg = (Math.round(grams / 100) / 10).toString();
  return `${lang === "mk" ? kg.replace(".", ",") : kg} kg`;
}

export function stationName(station: { nameMk: string; nameEn: string }, lang: Lang): string {
  return lang === "mk" ? station.nameMk : station.nameEn;
}

export function stationAddress(station: { addressMk: string; addressEn: string }, lang: Lang): string {
  return lang === "mk" ? station.addressMk : station.addressEn;
}

/** Translate an API error code (and its details) into a message. */
export function errorMessage(dict: Dict, code: string | undefined, details?: { attemptsLeft?: number }): string {
  const known = code && code in dict.errors ? dict.errors[code as keyof Dict["errors"]] : dict.common.genericError;
  if (code === "INVALID_CODE" && typeof details?.attemptsLeft === "number") {
    return `${known} ${fmt(dict.errors.attemptsLeft, { n: details.attemptsLeft })}`;
  }
  return known;
}
