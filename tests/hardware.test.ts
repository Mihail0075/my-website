import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { lockerCommands, lockers } from "@/db/schema";
import { completeCommand, pendingCommands, setDoorState } from "@/lib/services/lockers";
import { createParcel, payParcel, startDropoff } from "@/lib/services/parcels";
import { parcelInput, resetDb } from "./helpers";

describe("hardware controller protocol", () => {
  beforeEach(() => {
    process.env.LOCKER_MODE = "hardware";
  });
  afterEach(() => {
    process.env.LOCKER_MODE = "simulated";
  });

  it("queues an OPEN command, then tracks the door through the controller's reports", async () => {
    const { sk, pp } = await resetDb();
    const created = await createParcel(parcelInput(sk.id, pp.id), { via: "ONLINE" });
    const paid = await payParcel(created.senderToken, "CARD_ONLINE");
    const { lockerNumber } = await startDropoff(sk.id, paid.dropoffCode!);

    const door = async () =>
      (await db.select().from(lockers).where(and(eq(lockers.stationId, sk.id), eq(lockers.number, lockerNumber))))[0].doorOpen;

    const queued = await pendingCommands(sk.id);
    expect(queued.map((c) => [c.action, c.lockerNumber])).toEqual([["OPEN", lockerNumber]]);
    expect(await pendingCommands(pp.id)).toEqual([]);
    expect(await door()).toBe(false); // not open until the controller says so

    await completeCommand(sk.id, queued[0].id);
    expect(await pendingCommands(sk.id)).toEqual([]);
    expect(await door()).toBe(true);

    await setDoorState(sk.id, lockerNumber, false); // door sensor: closed
    expect(await door()).toBe(false);
  });

  it("never hands out stale open commands to a controller that was offline", async () => {
    const { sk, pp } = await resetDb();
    const created = await createParcel(parcelInput(sk.id, pp.id), { via: "ONLINE" });
    const paid = await payParcel(created.senderToken, "CARD_ONLINE");
    await startDropoff(sk.id, paid.dropoffCode!);
    await db.update(lockerCommands).set({ createdAt: new Date(Date.now() - 2 * 60_000) });
    expect(await pendingCommands(sk.id)).toEqual([]);
    const [cmd] = await db.select().from(lockerCommands);
    expect(cmd.status).toBe("EXPIRED");
    await expect(completeCommand(sk.id, cmd.id)).rejects.toThrow("NOT_FOUND");
  });
});
