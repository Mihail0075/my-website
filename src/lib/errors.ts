/**
 * Domain errors carry a stable code; the UI translates the code, so the
 * server never has to know the viewer's language.
 */
export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_ORIGIN"
  | "INVALID_CODE"
  | "KEYPAD_LOCKED"
  | "PARCEL_EXPIRED"
  | "PARCEL_AT_COUNTER"
  | "NO_FREE_LOCKER"
  | "INVALID_STATE"
  | "WEIGHT_TOO_HIGH"
  | "SAME_STATION"
  | "LOGIN_FAILED"
  | "LOGIN_LOCKED"
  | "KIOSK_NOT_REGISTERED"
  | "NOT_SIMULATED";

const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_ORIGIN: 403,
  INVALID_CODE: 400,
  KEYPAD_LOCKED: 429,
  PARCEL_EXPIRED: 409,
  PARCEL_AT_COUNTER: 409,
  NO_FREE_LOCKER: 409,
  INVALID_STATE: 409,
  WEIGHT_TOO_HIGH: 400,
  SAME_STATION: 400,
  LOGIN_FAILED: 401,
  LOGIN_LOCKED: 429,
  KIOSK_NOT_REGISTERED: 401,
  NOT_SIMULATED: 400,
};

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public details: Record<string, unknown> = {},
  ) {
    super(code);
  }
  get status() {
    return HTTP_STATUS[this.code];
  }
}

/** Postgres unique_violation, used to retry when a random code collides. */
export function isUniqueViolation(err: unknown): boolean {
  let e: unknown = err;
  while (e && typeof e === "object") {
    if ((e as { code?: string }).code === "23505") return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

export async function retryOnUnique<T>(fn: () => Promise<T>, attempts = 8): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts || !isUniqueViolation(err)) throw err;
    }
  }
}
