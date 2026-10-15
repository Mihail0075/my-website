import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "@/db";
import {
  lockers,
  parcelEvents,
  parcels,
  PIN_HOLDING_STATUSES,
  stations,
  type Parcel,
  type ParcelStatus,
  type Station,
} from "@/db/schema";
import {
  calcPrice,
  CODE_LOCK_MINUTES,
  fittingSizes,
  MAX_CODE_ATTEMPTS,
  MAX_WEIGHT_KG,
  PICKUP_WINDOW_HOURS,
  SIZES,
  UNPAID_TTL_MINUTES,
} from "@/lib/config";
import { isDigits, newDropoffCode, newPickupPin, newToken, newTrackingNumber } from "@/lib/codes";
import { AppError, retryOnUnique } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { assertNotLocked, kioskScope, recordAttempt, withAttempts } from "./attempts";
import { assignLocker, lockerMode, lockerOfParcel, openLocker, releaseLocker, setDoorState } from "./lockers";
import { notifyExpired, notifyRecipientReady, notifySenderConfirmed, notifySenderDelivered } from "./notify";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export { normalizePhone };

const phone = z
  .string()
  .max(30)
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "phone" });
    return n ?? "";
  });

const optionalEmail = z
  .union([z.literal(""), z.email().max(200)])
  .optional()
  .transform((v) => (v ? v.toLowerCase() : null));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const parcelInputSchema = z
  .object({
    originStationId: z.uuid(),
    destinationStationId: z.uuid(),
    size: z.enum(SIZES as ["S", "M", "L"]),
    weightKg: z.coerce.number().min(0.1).max(MAX_WEIGHT_KG),
    senderName: z.string().trim().min(2).max(100),
    senderPhone: phone,
    senderEmail: optionalEmail,
    recipientName: z.string().trim().min(2).max(100),
    recipientPhone: phone,
    recipientEmail: optionalEmail,
    deliveryType: z.enum(["LOCKER", "COURIER"]).default("LOCKER"),
    deliveryAddress: optionalText(300),
    note: optionalText(300),
    lang: z.enum(["mk", "en"]).default("mk"),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryType === "COURIER" && !v.deliveryAddress) {
      ctx.addIssue({ code: "custom", path: ["deliveryAddress"], message: "required" });
    }
  });

export type ParcelInput = z.input<typeof parcelInputSchema>;

function parseInput(raw: unknown) {
  const result = parcelInputSchema.safeParse(raw);
  if (!result.success) {
    const fields = Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
    throw new AppError("VALIDATION", { fields });
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EventOpts = { stationId?: string | null; lockerNumber?: number | null; userId?: string | null; note?: string | null };

async function addEvent(tx: DbOrTx, parcelId: string, type: string, opts: EventOpts = {}) {
  await tx.insert(parcelEvents).values({
    parcelId,
    type,
    stationId: opts.stationId ?? null,
    lockerNumber: opts.lockerNumber ?? null,
    userId: opts.userId ?? null,
    note: opts.note ?? null,
  });
}

async function lockParcel(tx: DbOrTx, parcelId: string): Promise<Parcel> {
  const [p] = await tx.select().from(parcels).where(eq(parcels.id, parcelId)).for("update");
  if (!p) throw new AppError("NOT_FOUND");
  return p;
}

function expect(condition: boolean): asserts condition {
  if (!condition) throw new AppError("INVALID_STATE");
}

async function freePin(tx: DbOrTx, destinationStationId: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const pin = newPickupPin();
    const [taken] = await tx
      .select({ id: parcels.id })
      .from(parcels)
      .where(
        and(
          eq(parcels.destinationStationId, destinationStationId),
          eq(parcels.pickupPin, pin),
          inArray(parcels.status, [...PIN_HOLDING_STATUSES]),
        ),
      )
      .limit(1);
    if (!taken) return pin;
  }
  throw new Error("Could not find a free PIN");
}

async function freeDropoffCode(tx: DbOrTx, originStationId: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const code = newDropoffCode();
    const [taken] = await tx
      .select({ id: parcels.id })
      .from(parcels)
      .where(
        and(
          eq(parcels.originStationId, originStationId),
          eq(parcels.dropoffCode, code),
          inArray(parcels.status, ["AWAITING_DROPOFF", "AT_ORIGIN"]),
        ),
      )
      .limit(1);
    if (!taken) return code;
  }
  throw new Error("Could not find a free drop-off code");
}

export async function getStations(): Promise<Station[]> {
  return db.select().from(stations).orderBy(asc(stations.code));
}

export async function getStationByCode(code: string): Promise<Station | null> {
  const [s] = await db.select().from(stations).where(eq(stations.code, code.toUpperCase())).limit(1);
  return s ?? null;
}

async function getStationById(id: string, tx: DbOrTx = db): Promise<Station | null> {
  const [s] = await tx.select().from(stations).where(eq(stations.id, id)).limit(1);
  return s ?? null;
}

// ---------------------------------------------------------------------------
// Creating and paying
// ---------------------------------------------------------------------------

type CreateOpts =
  | { via: "ONLINE" }
  | { via: "KIOSK"; kioskStationId: string }
  | { via: "COUNTER"; userId: string; payment: "CASH" | "CARD_POS" };

export async function createParcel(raw: unknown, opts: CreateOpts): Promise<Parcel> {
  const input = parseInput(raw);
  if (input.originStationId === input.destinationStationId) throw new AppError("SAME_STATION");
  if (opts.via === "ONLINE" && !input.senderEmail) {
    throw new AppError("VALIDATION", { fields: { senderEmail: "email_or_phone" } });
  }
  if (opts.via === "KIOSK" && input.originStationId !== opts.kioskStationId) throw new AppError("FORBIDDEN");
  const [origin, destination] = await Promise.all([getStationById(input.originStationId), getStationById(input.destinationStationId)]);
  if (!origin || !destination) throw new AppError("VALIDATION", { fields: { originStationId: "required" } });

  const priceDenars = calcPrice(input.size, input.weightKg);
  const atCounter = opts.via === "COUNTER";
  const userId = atCounter ? opts.userId : null;

  const parcel = await retryOnUnique(() =>
    db.transaction(async (tx) => {
      const now = new Date();
      const [p] = await tx
        .insert(parcels)
        .values({
          trackingNumber: newTrackingNumber(),
          originStationId: input.originStationId,
          destinationStationId: input.destinationStationId,
          size: input.size,
          weightGrams: Math.round(input.weightKg * 1000),
          priceDenars,
          status: atCounter ? "AT_ORIGIN" : "AWAITING_PAYMENT",
          paymentMethod: atCounter ? opts.payment : null,
          paymentStatus: atCounter ? "PAID" : "PENDING",
          paidAt: atCounter ? now : null,
          atOriginAt: atCounter ? now : null,
          deliveryType: input.deliveryType,
          deliveryAddress: input.deliveryType === "COURIER" ? input.deliveryAddress : null,
          senderName: input.senderName,
          senderPhone: input.senderPhone,
          senderEmail: input.senderEmail,
          recipientName: input.recipientName,
          recipientPhone: input.recipientPhone,
          recipientEmail: input.recipientEmail,
          note: input.note,
          lang: input.lang,
          pickupPin: await freePin(tx, input.destinationStationId),
          senderToken: newToken(),
          pickupToken: newToken(),
          createdVia: opts.via,
          createdByUserId: userId,
        })
        .returning();
      await addEvent(tx, p.id, "CREATED", { stationId: p.originStationId, userId });
      if (atCounter) {
        await addEvent(tx, p.id, "PAID", { stationId: p.originStationId, userId, note: opts.payment });
        await addEvent(tx, p.id, "ACCEPTED_AT_COUNTER", { stationId: p.originStationId, userId });
      }
      return p;
    }),
  );
  if (atCounter) await notifySenderConfirmed(parcel);
  return parcel;
}

/**
 * Mark a parcel as paid and give it a drop-off code. Idempotent: paying an
 * already paid parcel returns it unchanged (payment callbacks can repeat).
 */
export async function payParcel(senderToken: string, method: "CARD_ONLINE" | "CARD_KIOSK", ref?: string): Promise<Parcel> {
  const { parcel, changed } = await retryOnUnique(() =>
    db.transaction(async (tx) => {
      const [p] = await tx.select().from(parcels).where(eq(parcels.senderToken, senderToken)).for("update");
      if (!p) throw new AppError("NOT_FOUND");
      if (p.paymentStatus === "PAID") return { parcel: p, changed: false };
      expect(p.status === "AWAITING_PAYMENT");
      const [updated] = await tx
        .update(parcels)
        .set({
          status: "AWAITING_DROPOFF",
          paymentStatus: "PAID",
          paymentMethod: method,
          paymentRef: ref ?? null,
          paidAt: new Date(),
          dropoffCode: await freeDropoffCode(tx, p.originStationId),
          updatedAt: new Date(),
        })
        .where(eq(parcels.id, p.id))
        .returning();
      await addEvent(tx, p.id, "PAID", { stationId: p.originStationId, note: method });
      return { parcel: updated, changed: true };
    }),
  );
  if (changed) await notifySenderConfirmed(parcel);
  return parcel;
}

// ---------------------------------------------------------------------------
// Kiosk: drop-off and pickup
// ---------------------------------------------------------------------------

export async function startDropoff(stationId: string, code: string) {
  const scope = kioskScope("DROPOFF", stationId, MAX_CODE_ATTEMPTS, CODE_LOCK_MINUTES);
  return withAttempts(scope, async () => {
    if (!isDigits(code, 6)) return null;
    return db.transaction(async (tx) => {
      const [p] = await tx
        .select()
        .from(parcels)
        .where(and(eq(parcels.originStationId, stationId), eq(parcels.status, "AWAITING_DROPOFF"), eq(parcels.dropoffCode, code)))
        .for("update");
      if (!p) return null;
      const locker = await assignLocker(tx, stationId, p.id, fittingSizes(p.size));
      await openLocker(tx, locker);
      await tx.update(parcels).set({ status: "AT_ORIGIN", atOriginAt: new Date(), updatedAt: new Date() }).where(eq(parcels.id, p.id));
      await addEvent(tx, p.id, "DROPPED_OFF", { stationId, lockerNumber: locker.number });
      return { parcelId: p.id, trackingNumber: p.trackingNumber, lockerNumber: locker.number };
    });
  });
}

/** Sender says the parcel does not fit: free the locker and keep the code valid. */
export async function cancelDropoff(stationId: string, parcelId: string) {
  await db.transaction(async (tx) => {
    const p = await lockParcel(tx, parcelId);
    const recent = p.atOriginAt && Date.now() - p.atOriginAt.getTime() < 10 * 60_000;
    expect(p.originStationId === stationId && p.status === "AT_ORIGIN" && p.createdVia !== "COUNTER" && !!recent);
    const locker = await lockerOfParcel(tx, p.id);
    if (locker) {
      await openLocker(tx, locker);
      await releaseLocker(tx, locker.id);
    }
    await tx.update(parcels).set({ status: "AWAITING_DROPOFF", atOriginAt: null, updatedAt: new Date() }).where(eq(parcels.id, p.id));
    await addEvent(tx, p.id, "DROPOFF_CANCELLED", { stationId, lockerNumber: locker?.number });
  });
}

export async function pickupAtKiosk(stationId: string, cred: { pin: string } | { token: string }) {
  await sweep();
  const scope = kioskScope("PICKUP", stationId, MAX_CODE_ATTEMPTS, CODE_LOCK_MINUTES);
  await assertNotLocked(scope);

  const wellFormed = "pin" in cred ? isDigits(cred.pin, 4) : /^[\w-]{16,64}$/.test(cred.token);
  const result = !wellFormed
    ? ({ kind: "miss" } as const)
    : await db.transaction(async (tx) => {
        const match = "pin" in cred ? eq(parcels.pickupPin, cred.pin) : eq(parcels.pickupToken, cred.token);
        const [p] = await tx
          .select()
          .from(parcels)
          .where(and(eq(parcels.destinationStationId, stationId), match, inArray(parcels.status, ["READY_FOR_PICKUP", "EXPIRED"])))
          .for("update");
        if (!p) return { kind: "miss" } as const;
        if (p.status === "EXPIRED") return { kind: "expired" } as const;
        const locker = await lockerOfParcel(tx, p.id);
        if (!locker) return { kind: "counter" } as const;
        await openLocker(tx, locker);
        await releaseLocker(tx, locker.id);
        const [updated] = await tx
          .update(parcels)
          .set({ status: "PICKED_UP", pickedUpAt: new Date(), updatedAt: new Date() })
          .where(eq(parcels.id, p.id))
          .returning();
        await addEvent(tx, p.id, "PICKED_UP", { stationId, lockerNumber: locker.number });
        return { kind: "ok", parcel: updated, lockerNumber: locker.number } as const;
      });

  const { attemptsLeft } = await recordAttempt(scope, result.kind !== "miss");
  if (result.kind === "miss") throw new AppError("INVALID_CODE", { attemptsLeft });
  if (result.kind === "expired") throw new AppError("PARCEL_EXPIRED");
  if (result.kind === "counter") throw new AppError("PARCEL_AT_COUNTER");
  await notifySenderDelivered(result.parcel);
  return { lockerNumber: result.lockerNumber, trackingNumber: result.parcel.trackingNumber };
}

/** Kiosk "I closed the door" in simulation; with real hardware the door sensor reports this. */
export async function closeDoorSimulated(stationId: string, lockerNumber: number) {
  if (lockerMode() !== "simulated") throw new AppError("NOT_SIMULATED");
  await setDoorState(stationId, lockerNumber, false);
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/** Driver takes a parcel at its origin station (from a locker or from the counter). */
export async function loadParcel(parcelId: string, stationId: string, userId: string) {
  return db.transaction(async (tx) => {
    const p = await lockParcel(tx, parcelId);
    expect(p.originStationId === stationId && p.status === "AT_ORIGIN");
    const locker = await lockerOfParcel(tx, p.id);
    if (locker) {
      await openLocker(tx, locker);
      await releaseLocker(tx, locker.id);
    }
    await tx.update(parcels).set({ status: "IN_TRANSIT", inTransitAt: new Date(), updatedAt: new Date() }).where(eq(parcels.id, p.id));
    await addEvent(tx, p.id, "LOADED", { stationId, lockerNumber: locker?.number, userId });
    return { lockerNumber: locker?.number ?? null, trackingNumber: p.trackingNumber };
  });
}

/**
 * Driver arrives at the destination: put the parcel in the smallest free
 * locker that fits (the door opens) or leave it at the counter. For lockers
 * the recipient is notified once the driver confirms it fits.
 */
export async function unloadParcel(parcelId: string, stationId: string, userId: string, mode: "LOCKER" | "COUNTER") {
  const out = await db.transaction(async (tx) => {
    const p = await lockParcel(tx, parcelId);
    expect(p.destinationStationId === stationId && p.status === "IN_TRANSIT");
    let lockerNumber: number | null = null;
    if (mode === "LOCKER") {
      const locker = await assignLocker(tx, stationId, p.id, fittingSizes(p.size));
      await openLocker(tx, locker);
      lockerNumber = locker.number;
    } else {
      const station = await getStationById(stationId, tx);
      expect(!!station?.hasCounter);
    }
    const now = new Date();
    const [updated] = await tx
      .update(parcels)
      .set({
        status: "READY_FOR_PICKUP",
        readyAt: now,
        pickupDeadline: new Date(now.getTime() + PICKUP_WINDOW_HOURS * 3600_000),
        readyNotifiedAt: mode === "COUNTER" ? now : null,
        updatedAt: now,
      })
      .where(eq(parcels.id, p.id))
      .returning();
    await addEvent(tx, p.id, "UNLOADED", { stationId, lockerNumber, userId });
    return { parcel: updated, lockerNumber };
  });
  if (mode === "COUNTER") await notifyRecipientReady(out.parcel, null);
  return { lockerNumber: out.lockerNumber, trackingNumber: out.parcel.trackingNumber };
}

/** Driver confirms the parcel is in the locker; the recipient gets the message with the locker number. */
export async function confirmPlaced(parcelId: string, stationId: string, userId: string) {
  const [claimed] = await db
    .update(parcels)
    .set({ readyNotifiedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(parcels.id, parcelId),
        eq(parcels.destinationStationId, stationId),
        eq(parcels.status, "READY_FOR_PICKUP"),
        isNull(parcels.readyNotifiedAt),
      ),
    )
    .returning();
  if (!claimed) return;
  const locker = await lockerOfParcel(db, parcelId);
  if (locker && lockerMode() === "simulated") await setDoorState(stationId, locker.number, false);
  await addEvent(db, parcelId, "READY_NOTIFIED", { stationId, lockerNumber: locker?.number, userId });
  await notifyRecipientReady(claimed, locker?.number ?? null);
}

/** The parcel doesn't fit: move it to the next larger free locker. */
export async function moveToBiggerLocker(parcelId: string, stationId: string, userId: string) {
  const out = await db.transaction(async (tx) => {
    const p = await lockParcel(tx, parcelId);
    expect(p.destinationStationId === stationId && p.status === "READY_FOR_PICKUP");
    const current = await lockerOfParcel(tx, p.id);
    expect(!!current);
    const larger = SIZES.slice(SIZES.indexOf(current!.size) + 1);
    if (larger.length === 0) throw new AppError("NO_FREE_LOCKER");
    await releaseLocker(tx, current!.id);
    if (lockerMode() === "simulated") await tx.update(lockers).set({ doorOpen: false }).where(eq(lockers.id, current!.id));
    const next = await assignLocker(tx, stationId, p.id, larger);
    await openLocker(tx, next);
    // Record the bigger size so the price list and reports stay truthful.
    await tx.update(parcels).set({ size: next.size, updatedAt: new Date() }).where(eq(parcels.id, p.id));
    await addEvent(tx, p.id, "MOVED", { stationId, lockerNumber: next.number, userId, note: `from ${current!.number}` });
    return { parcel: p, lockerNumber: next.number };
  });
  if (out.parcel.readyNotifiedAt) {
    await notifyRecipientReady({ ...out.parcel }, out.lockerNumber);
  }
  return { lockerNumber: out.lockerNumber, trackingNumber: out.parcel.trackingNumber };
}

/** Driver removes a parcel whose pickup period expired. */
export async function removeExpired(parcelId: string, stationId: string, userId: string) {
  return db.transaction(async (tx) => {
    const p = await lockParcel(tx, parcelId);
    expect(p.destinationStationId === stationId && p.status === "EXPIRED");
    const locker = await lockerOfParcel(tx, p.id);
    if (locker) {
      await openLocker(tx, locker);
      await releaseLocker(tx, locker.id);
    }
    await tx.update(parcels).set({ status: "RETURNED", updatedAt: new Date() }).where(eq(parcels.id, p.id));
    await addEvent(tx, p.id, "RETURNED", { stationId, lockerNumber: locker?.number, userId });
    return { lockerNumber: locker?.number ?? null, trackingNumber: p.trackingNumber };
  });
}

// ---------------------------------------------------------------------------
// Counter and admin
// ---------------------------------------------------------------------------

/** Counter staff hands a parcel to the recipient after checking the PIN. */
export async function handoverAtCounter(parcelId: string, pin: string, stationId: string, userId: string) {
  const scope = { ...kioskScope("PICKUP", stationId, MAX_CODE_ATTEMPTS, CODE_LOCK_MINUTES), kind: `HANDOVER:${parcelId}` };
  const parcel = await withAttempts(scope, () =>
    db.transaction(async (tx) => {
      const p = await lockParcel(tx, parcelId);
      expect(p.destinationStationId === stationId && (p.status === "READY_FOR_PICKUP" || p.status === "EXPIRED"));
      if (!isDigits(pin, 4) || p.pickupPin !== pin) return null;
      const locker = await lockerOfParcel(tx, p.id);
      if (locker) {
        await openLocker(tx, locker);
        await releaseLocker(tx, locker.id);
      }
      const [updated] = await tx
        .update(parcels)
        .set({ status: "PICKED_UP", pickedUpAt: new Date(), updatedAt: new Date() })
        .where(eq(parcels.id, p.id))
        .returning();
      await addEvent(tx, p.id, "HANDED_OVER", { stationId, lockerNumber: locker?.number, userId });
      return updated;
    }),
  );
  await notifySenderDelivered(parcel);
}

export async function extendDeadline(parcelId: string, userId: string) {
  await db.transaction(async (tx) => {
    const p = await lockParcel(tx, parcelId);
    expect(p.status === "READY_FOR_PICKUP" || p.status === "EXPIRED");
    const deadline = new Date(Date.now() + PICKUP_WINDOW_HOURS * 3600_000);
    await tx.update(parcels).set({ status: "READY_FOR_PICKUP", pickupDeadline: deadline, updatedAt: new Date() }).where(eq(parcels.id, p.id));
    await addEvent(tx, p.id, "EXTENDED", { stationId: p.destinationStationId, userId });
  });
}

export async function cancelParcel(parcelId: string, userId: string) {
  await db.transaction(async (tx) => {
    const p = await lockParcel(tx, parcelId);
    expect(["AWAITING_PAYMENT", "AWAITING_DROPOFF", "AT_ORIGIN"].includes(p.status));
    const locker = await lockerOfParcel(tx, p.id);
    if (locker) {
      await openLocker(tx, locker);
      await releaseLocker(tx, locker.id);
    }
    await tx.update(parcels).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(parcels.id, p.id));
    await addEvent(tx, p.id, "CANCELLED", { stationId: p.originStationId, lockerNumber: locker?.number, userId });
  });
}

// ---------------------------------------------------------------------------
// Background housekeeping (run lazily; no cron needed)
// ---------------------------------------------------------------------------

let lastSweep = 0;

/**
 * Cancels stale unpaid parcels, expires parcels past their pickup deadline and
 * sends "ready" messages the driver forgot to trigger. Safe to run concurrently:
 * every transition is a conditional UPDATE … RETURNING.
 */
export async function sweep(opts: { force?: boolean } = {}) {
  if (!opts.force && Date.now() - lastSweep < 20_000) return;
  lastSweep = Date.now();
  const now = new Date();

  const unpaid = await db
    .update(parcels)
    .set({ status: "CANCELLED", updatedAt: now })
    .where(and(eq(parcels.status, "AWAITING_PAYMENT"), lt(parcels.createdAt, new Date(now.getTime() - UNPAID_TTL_MINUTES * 60_000))))
    .returning({ id: parcels.id });
  for (const p of unpaid) await addEvent(db, p.id, "CANCELLED", { note: "unpaid" });

  const expired = await db
    .update(parcels)
    .set({ status: "EXPIRED", updatedAt: now })
    .where(and(eq(parcels.status, "READY_FOR_PICKUP"), lt(parcels.pickupDeadline, now)))
    .returning();
  for (const p of expired) {
    await addEvent(db, p.id, "EXPIRED", { stationId: p.destinationStationId });
    await notifyExpired(p);
  }

  const unnotified = await db
    .update(parcels)
    .set({ readyNotifiedAt: now })
    .where(
      and(eq(parcels.status, "READY_FOR_PICKUP"), isNull(parcels.readyNotifiedAt), lt(parcels.readyAt, new Date(now.getTime() - 5 * 60_000))),
    )
    .returning();
  for (const p of unnotified) {
    const locker = await lockerOfParcel(db, p.id);
    await addEvent(db, p.id, "READY_NOTIFIED", { stationId: p.destinationStationId, lockerNumber: locker?.number });
    await notifyRecipientReady(p, locker?.number ?? null);
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type ParcelRow = Parcel & { lockerNumber: number | null };

const withLocker = {
  lockerNumber: lockers.number,
};

async function parcelRows(where: ReturnType<typeof and>, order: "asc" | "desc" = "asc", limit = 200): Promise<ParcelRow[]> {
  const rows = await db
    .select({ parcel: parcels, ...withLocker })
    .from(parcels)
    .leftJoin(lockers, eq(lockers.parcelId, parcels.id))
    .where(where)
    .orderBy(order === "asc" ? asc(parcels.updatedAt) : desc(parcels.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.parcel, lockerNumber: r.lockerNumber }));
}

export async function getParcelRow(parcelId: string): Promise<ParcelRow | null> {
  const [row] = await parcelRows(eq(parcels.id, parcelId));
  return row ?? null;
}

export async function findParcel(by: { tracking?: string; senderToken?: string; pickupToken?: string }): Promise<ParcelRow | null> {
  const cond = by.tracking
    ? eq(parcels.trackingNumber, by.tracking.replace(/\s/g, ""))
    : by.senderToken
      ? eq(parcels.senderToken, by.senderToken)
      : by.pickupToken
        ? eq(parcels.pickupToken, by.pickupToken)
        : undefined;
  if (!cond) return null;
  const [row] = await parcelRows(and(cond));
  return row ?? null;
}

export async function parcelEventsOf(parcelId: string) {
  return db.select().from(parcelEvents).where(eq(parcelEvents.parcelId, parcelId)).orderBy(asc(parcelEvents.createdAt));
}

export async function driverLists(stationId: string) {
  await sweep();
  const [unload, load, pending, expired] = await Promise.all([
    parcelRows(and(eq(parcels.destinationStationId, stationId), eq(parcels.status, "IN_TRANSIT"))),
    parcelRows(and(eq(parcels.originStationId, stationId), eq(parcels.status, "AT_ORIGIN"))),
    parcelRows(and(eq(parcels.destinationStationId, stationId), eq(parcels.status, "READY_FOR_PICKUP"), isNull(parcels.readyNotifiedAt))),
    parcelRows(and(eq(parcels.destinationStationId, stationId), eq(parcels.status, "EXPIRED"))),
  ]);
  return { unload, load, pending, expired };
}

export async function counterLists(stationId: string) {
  await sweep();
  const [waitingDriver, forPickup] = await Promise.all([
    parcelRows(and(eq(parcels.originStationId, stationId), eq(parcels.status, "AT_ORIGIN"))),
    parcelRows(and(eq(parcels.destinationStationId, stationId), inArray(parcels.status, ["READY_FOR_PICKUP", "EXPIRED"]))),
  ]);
  return { waitingDriver, forPickup };
}

export async function adminParcels(status?: ParcelStatus, q?: string, delivery?: "LOCKER" | "COURIER") {
  await sweep();
  const search = q?.trim().replace(/^#/, "");
  const where = and(
    status ? eq(parcels.status, status) : undefined,
    delivery ? eq(parcels.deliveryType, delivery) : undefined,
    search && /^\d{1,4}$/.test(search)
      ? eq(parcels.shortNumber, Number(search))
      : search
      ? sql`(${parcels.trackingNumber} ilike ${"%" + search + "%"} or ${parcels.senderName} ilike ${"%" + search + "%"} or ${parcels.recipientName} ilike ${"%" + search + "%"} or ${parcels.senderPhone} ilike ${"%" + search + "%"} or ${parcels.recipientPhone} ilike ${"%" + search + "%"})`
      : undefined,
  );
  return parcelRows(where, "desc", 200);
}
