import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

function digits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += randomInt(0, 10).toString();
  return out;
}

/** 10-digit tracking number that never starts with 0. */
export function newTrackingNumber(): string {
  return randomInt(1, 10).toString() + digits(9);
}

// PINs people guess first; never hand these out.
const WEAK_PINS = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "1212", "0123", "9876", "2580", "1122", "6969", "1004", "2000", "2020", "2025", "2026"]);

export function newPickupPin(): string {
  for (;;) {
    const pin = digits(4);
    if (!WEAK_PINS.has(pin)) return pin;
  }
}

export function newDropoffCode(): string {
  return digits(6);
}

export function newServicePin(): string {
  return digits(6);
}

/** URL-safe random token for links and cookies. */
export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s === "change-me") {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production");
    return "dev-secret-not-for-production";
  }
  return s;
}

/** Keyed hash for values we must look up by equality (service PINs, controller keys). */
export function hmac(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isDigits(value: unknown, length: number): value is string {
  return typeof value === "string" && value.length === length && /^\d+$/.test(value);
}
