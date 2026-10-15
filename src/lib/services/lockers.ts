import { and, asc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { lockerCommands, lockers, parcels, type Locker, type LockerSize } from "@/db/schema";
import { COMMAND_TTL_SECONDS, SIZES } from "@/lib/config";
import { AppError } from "@/lib/errors";

export function lockerMode(): "simulated" | "hardware" {
  return process.env.LOCKER_MODE === "hardware" ? "hardware" : "simulated";
}

/**
 * Reserve the smallest free locker among `sizes` for a parcel. Rows are locked
 * with SKIP LOCKED so two kiosks never get the same locker.
 */
export async function assignLocker(
  tx: DbOrTx,
  stationId: string,
  parcelId: string,
  sizes: LockerSize[],
  excludeLockerId?: string,
): Promise<Locker> {
  const sizeOrder = sql`case ${lockers.size} when 'S' then 1 when 'M' then 2 else 3 end`;
  const [free] = await tx
    .select()
    .from(lockers)
    .where(
      and(
        eq(lockers.stationId, stationId),
        isNull(lockers.parcelId),
        eq(lockers.outOfService, false),
        inArray(lockers.size, sizes),
        excludeLockerId ? ne(lockers.id, excludeLockerId) : undefined,
      ),
    )
    .orderBy(sizeOrder, asc(lockers.number))
    .limit(1)
    .for("update", { skipLocked: true });
  if (!free) throw new AppError("NO_FREE_LOCKER");
  const [taken] = await tx
    .update(lockers)
    .set({ parcelId, updatedAt: new Date() })
    .where(eq(lockers.id, free.id))
    .returning();
  return taken;
}

export async function lockerOfParcel(tx: DbOrTx, parcelId: string): Promise<Locker | null> {
  const [row] = await tx.select().from(lockers).where(eq(lockers.parcelId, parcelId)).limit(1);
  return row ?? null;
}

export async function releaseLocker(tx: DbOrTx, lockerId: string) {
  await tx.update(lockers).set({ parcelId: null, updatedAt: new Date() }).where(eq(lockers.id, lockerId));
}

/**
 * Open a locker door. The command is queued for the station's hardware
 * controller; in simulated mode the door is shown as open right away.
 */
export async function openLocker(tx: DbOrTx, locker: Pick<Locker, "id" | "stationId" | "number">) {
  const simulated = lockerMode() === "simulated";
  await tx.update(lockers).set({ doorOpen: simulated ? true : undefined, updatedAt: new Date() }).where(eq(lockers.id, locker.id));
  await tx.insert(lockerCommands).values({
    stationId: locker.stationId,
    lockerNumber: locker.number,
    action: "OPEN",
    status: simulated ? "DONE" : "PENDING",
    doneAt: simulated ? new Date() : null,
  });
}

export async function setDoorState(stationId: string, number: number, open: boolean) {
  const [row] = await db
    .update(lockers)
    .set({ doorOpen: open, updatedAt: new Date() })
    .where(and(eq(lockers.stationId, stationId), eq(lockers.number, number)))
    .returning({ id: lockers.id });
  if (!row) throw new AppError("NOT_FOUND");
}

export type LockerView = {
  id: string;
  number: number;
  size: LockerSize;
  doorOpen: boolean;
  outOfService: boolean;
  parcel: { id: string; trackingNumber: string; shortNumber: number; status: string } | null;
};

export async function stationLockers(stationId: string): Promise<LockerView[]> {
  const rows = await db
    .select({
      id: lockers.id,
      number: lockers.number,
      size: lockers.size,
      doorOpen: lockers.doorOpen,
      outOfService: lockers.outOfService,
      parcelId: parcels.id,
      trackingNumber: parcels.trackingNumber,
      shortNumber: parcels.shortNumber,
      status: parcels.status,
    })
    .from(lockers)
    .leftJoin(parcels, eq(parcels.id, lockers.parcelId))
    .where(eq(lockers.stationId, stationId))
    .orderBy(asc(lockers.number));
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    size: r.size,
    doorOpen: r.doorOpen,
    outOfService: r.outOfService,
    parcel: r.parcelId ? { id: r.parcelId, trackingNumber: r.trackingNumber!, shortNumber: r.shortNumber!, status: r.status! } : null,
  }));
}

export async function freeLockerCounts(stationId: string): Promise<Record<LockerSize, number>> {
  const rows = await db
    .select({ size: lockers.size, n: sql<number>`count(*)::int` })
    .from(lockers)
    .where(and(eq(lockers.stationId, stationId), isNull(lockers.parcelId), eq(lockers.outOfService, false)))
    .groupBy(lockers.size);
  const counts = Object.fromEntries(SIZES.map((s) => [s, 0])) as Record<LockerSize, number>;
  for (const r of rows) counts[r.size] = r.n;
  return counts;
}

/** Service opening by an admin (e.g. stuck door, maintenance). */
export async function adminOpenLocker(lockerId: string) {
  await db.transaction(async (tx) => {
    const [locker] = await tx.select().from(lockers).where(eq(lockers.id, lockerId)).for("update");
    if (!locker) throw new AppError("NOT_FOUND");
    await openLocker(tx, locker);
  });
}

export async function setOutOfService(lockerId: string, outOfService: boolean) {
  const [row] = await db.update(lockers).set({ outOfService, updatedAt: new Date() }).where(eq(lockers.id, lockerId)).returning();
  if (!row) throw new AppError("NOT_FOUND");
  return row;
}

export async function getLocker(lockerId: string) {
  const [row] = await db.select().from(lockers).where(eq(lockers.id, lockerId)).limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Hardware controller protocol (see docs/HARDWARE.md)
// ---------------------------------------------------------------------------

export async function pendingCommands(stationId: string) {
  // Drop stale commands first so a reconnecting controller can't open doors late.
  await db
    .update(lockerCommands)
    .set({ status: "EXPIRED", doneAt: new Date() })
    .where(
      and(
        eq(lockerCommands.stationId, stationId),
        eq(lockerCommands.status, "PENDING"),
        lt(lockerCommands.createdAt, new Date(Date.now() - COMMAND_TTL_SECONDS * 1000)),
      ),
    );
  return db
    .select({ id: lockerCommands.id, lockerNumber: lockerCommands.lockerNumber, action: lockerCommands.action, createdAt: lockerCommands.createdAt })
    .from(lockerCommands)
    .where(and(eq(lockerCommands.stationId, stationId), eq(lockerCommands.status, "PENDING")))
    .orderBy(asc(lockerCommands.createdAt))
    .limit(50);
}

/** Controller confirms it executed a command; an OPEN marks the door open. */
export async function completeCommand(stationId: string, commandId: string) {
  const [cmd] = await db
    .update(lockerCommands)
    .set({ status: "DONE", doneAt: new Date() })
    .where(and(eq(lockerCommands.id, commandId), eq(lockerCommands.stationId, stationId), eq(lockerCommands.status, "PENDING")))
    .returning();
  if (!cmd) throw new AppError("NOT_FOUND");
  if (cmd.action === "OPEN") await setDoorState(stationId, cmd.lockerNumber, true);
}
