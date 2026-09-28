/** Accepts local (070 123 456) or international numbers and returns +389… form, or null. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.startsWith("00")) return digits.length >= 10 && digits.length <= 17 ? `+${digits.slice(2)}` : null;
  if (digits.startsWith("0") && digits.length === 9) return `+389${digits.slice(1)}`;
  if (digits.startsWith("389") && digits.length === 11) return `+${digits}`;
  return null;
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
