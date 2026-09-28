import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { codeAttempts } from "@/db/schema";
import { AppError } from "@/lib/errors";

type Scope = { kind: string; stationId: string | null; max: number; windowMinutes: number; lockedCode: "KEYPAD_LOCKED" | "LOGIN_LOCKED" };

/**
 * Rules: `max` wrong codes within `windowMinutes` lock the scope for
 * `windowMinutes`, counted from the failure that triggered the lock. When the
 * lock ends the count starts again from zero. A correct code also resets it.
 *
 * A lock is stored as its own row (kind "LOCK:<kind>") so its end time is exact.
 */
async function state(scope: Scope): Promise<{ failures: number; lockedUntil: Date | null }> {
  const lockKind = `LOCK:${scope.kind}`;
  const rows = await db
    .select({ kind: codeAttempts.kind, success: codeAttempts.success, createdAt: codeAttempts.createdAt })
    .from(codeAttempts)
    .where(
      and(
        inArray(codeAttempts.kind, [scope.kind, lockKind]),
        scope.stationId ? eq(codeAttempts.stationId, scope.stationId) : isNull(codeAttempts.stationId),
      ),
    )
    .orderBy(desc(codeAttempts.createdAt))
    .limit(scope.max + 1);

  const now = Date.now();
  const windowMs = scope.windowMinutes * 60_000;
  let failures = 0;
  for (const row of rows) {
    if (row.kind === lockKind) {
      const until = new Date(row.createdAt.getTime() + windowMs);
      return { failures, lockedUntil: until.getTime() > now ? until : null };
    }
    if (row.success || row.createdAt.getTime() <= now - windowMs) break;
    failures++;
  }
  return { failures, lockedUntil: null };
}

function lockedError(scope: Scope, until: Date) {
  return new AppError(scope.lockedCode, { lockedUntil: until.toISOString() });
}

/** Throws while the scope is locked; otherwise returns how many tries are left. */
export async function assertNotLocked(scope: Scope): Promise<{ attemptsLeft: number }> {
  const { failures, lockedUntil } = await state(scope);
  if (lockedUntil) throw lockedError(scope, lockedUntil);
  return { attemptsLeft: scope.max - failures };
}

/**
 * Record an attempt. A failure that reaches the limit starts the lock and
 * throws the "locked" error; otherwise returns the tries left.
 */
export async function recordAttempt(scope: Scope, success: boolean): Promise<{ attemptsLeft: number }> {
  await db.insert(codeAttempts).values({ kind: scope.kind, stationId: scope.stationId, success });
  if (success) return { attemptsLeft: scope.max };
  const { failures } = await state(scope);
  if (failures >= scope.max) {
    const [lock] = await db.insert(codeAttempts).values({ kind: `LOCK:${scope.kind}`, stationId: scope.stationId, success: false }).returning();
    throw lockedError(scope, new Date(lock.createdAt.getTime() + scope.windowMinutes * 60_000));
  }
  return { attemptsLeft: scope.max - failures };
}

export function kioskScope(kind: "PICKUP" | "DROPOFF" | "SERVICE_PIN", stationId: string, max: number, windowMinutes: number): Scope {
  return { kind, stationId, max, windowMinutes, lockedCode: "KEYPAD_LOCKED" };
}

export function loginScope(username: string, max: number, windowMinutes: number): Scope {
  return { kind: `LOGIN:${username.toLowerCase()}`, stationId: null, max, windowMinutes, lockedCode: "LOGIN_LOCKED" };
}

/**
 * Wraps a code check: throws if locked, records the outcome, and on a wrong
 * code throws INVALID_CODE (or LOGIN_FAILED) with the number of tries left.
 */
export async function withAttempts<T>(scope: Scope, check: () => Promise<T | null>): Promise<T> {
  await assertNotLocked(scope);
  const result = await check();
  const { attemptsLeft } = await recordAttempt(scope, result !== null);
  if (result === null) {
    throw new AppError(scope.lockedCode === "LOGIN_LOCKED" ? "LOGIN_FAILED" : "INVALID_CODE", { attemptsLeft });
  }
  return result;
}
