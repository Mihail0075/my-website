import type { LockerSize } from "@/db/schema";

/**
 * Business settings for the first version. Prices are placeholders until the
 * real price list is decided; everything here is in one place so it is easy to change.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Брза Пратка";
export const APP_NAME_EN = process.env.NEXT_PUBLIC_APP_NAME_EN ?? "Brza Pratka";

export const SIZES: LockerSize[] = ["S", "M", "L"];

/** Inner locker dimensions in cm (height × width × depth). */
export const LOCKER_DIMENSIONS: Record<LockerSize, { h: number; w: number; d: number }> = {
  S: { h: 8, w: 38, d: 64 },
  M: { h: 19, w: 38, d: 64 },
  L: { h: 41, w: 38, d: 64 },
};

/** Transport price bus station → bus station, in denars, by size. */
export const BASE_PRICE: Record<LockerSize, number> = { S: 150, M: 200, L: 250 };

/** Extra charge by weight. The first bracket the weight fits in applies. */
export const WEIGHT_BRACKETS: { upToKg: number; extra: number }[] = [
  { upToKg: 2, extra: 0 },
  { upToKg: 5, extra: 50 },
  { upToKg: 10, extra: 100 },
  { upToKg: 20, extra: 150 },
];

export const MAX_WEIGHT_KG = WEIGHT_BRACKETS[WEIGHT_BRACKETS.length - 1].upToKg;

/** How long a parcel waits in the destination locker before it expires. */
export const PICKUP_WINDOW_HOURS = 24;

/** Unpaid parcels are cancelled after this long, freeing their PIN. */
export const UNPAID_TTL_MINUTES = 60;

/** Keypad lock: this many wrong codes within the window locks the keypad for the window. */
export const MAX_CODE_ATTEMPTS = 5;
export const CODE_LOCK_MINUTES = 5;

/** Staff login lock after repeated wrong passwords. */
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;

export const SESSION_HOURS = 12;
/** Driver sessions opened with a service PIN on the kiosk. */
export const KIOSK_STAFF_SESSION_MINUTES = 10;

export const TIME_ZONE = "Europe/Skopje";

/**
 * A door-open command older than this is never executed: nobody is standing
 * at the locker any more (e.g. the controller was offline and reconnects).
 */
export const COMMAND_TTL_SECONDS = 60;

export function calcPrice(size: LockerSize, weightKg: number): number {
  const bracket = WEIGHT_BRACKETS.find((b) => weightKg <= b.upToKg);
  if (!bracket) throw new Error("WEIGHT_TOO_HIGH");
  return BASE_PRICE[size] + bracket.extra;
}

/** Sizes a parcel of the given size fits in, smallest first. */
export function fittingSizes(size: LockerSize): LockerSize[] {
  return SIZES.slice(SIZES.indexOf(size));
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
