import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { lockers, notifications, parcels } from "@/db/schema";
import { calcPrice } from "@/lib/config";
import { AppError } from "@/lib/errors";
import {
  cancelDropoff,
  confirmPlaced,
  createParcel,
  handoverAtCounter,
  loadParcel,
  moveToBiggerLocker,
  normalizePhone,
  payParcel,
  pickupAtKiosk,
  removeExpired,
  startDropoff,
  sweep,
  unloadParcel,
} from "@/lib/services/parcels";
import { verifyLogin, verifyServicePin } from "@/lib/services/staff";
import { parcelInput, resetDb } from "./helpers";

type Ctx = Awaited<ReturnType<typeof resetDb>>;
let ctx: Ctx;

async function reload(id: string) {
  const [p] = await db.select().from(parcels).where(eq(parcels.id, id));
  return p;
}

async function expectError(promise: Promise<unknown>, code: string) {
  const err = await promise.then(
    () => null,
    (e) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
  return err as AppError;
}

/** Online parcel Skopje → Prilep, paid and dropped off at the Skopje kiosk. */
async function droppedOffInSkopje(overrides: Record<string, unknown> = {}) {
  const created = await createParcel(parcelInput(ctx.sk.id, ctx.pp.id, overrides), { via: "ONLINE" });
  const paid = await payParcel(created.senderToken, "CARD_ONLINE");
  const drop = await startDropoff(ctx.sk.id, paid.dropoffCode!);
  return { parcel: paid, drop };
}

beforeEach(async () => {
  ctx = await resetDb();
});

describe("pricing and input", () => {
  it("prices by size plus weight bracket", () => {
    expect(calcPrice("S", 1)).toBe(100);
    expect(calcPrice("M", 4.9)).toBe(200);
    expect(calcPrice("L", 20)).toBe(350);
    expect(() => calcPrice("L", 20.1)).toThrow();
  });

  it("normalizes Macedonian phone numbers", () => {
    expect(normalizePhone("070 123 456")).toBe("+38970123456");
    expect(normalizePhone("+389 71 234 567")).toBe("+38971234567");
    expect(normalizePhone("0038970123456")).toBe("+38970123456");
    expect(normalizePhone("12")).toBeNull();
  });

  it("rejects same origin and destination, and missing email online", async () => {
    await expectError(createParcel(parcelInput(ctx.sk.id, ctx.sk.id), { via: "ONLINE" }), "SAME_STATION");
    await expectError(createParcel(parcelInput(ctx.sk.id, ctx.pp.id, { senderEmail: "" }), { via: "ONLINE" }), "VALIDATION");
  });

  it("requires an address for courier delivery", async () => {
    await expectError(createParcel(parcelInput(ctx.sk.id, ctx.pp.id, { deliveryType: "COURIER" }), { via: "ONLINE" }), "VALIDATION");
    const p = await createParcel(parcelInput(ctx.sk.id, ctx.pp.id, { deliveryType: "COURIER", deliveryAddress: "ул. Гоце Делчев 5" }), { via: "ONLINE" });
    expect(p.deliveryAddress).toBe("ул. Гоце Делчев 5");
  });
});

describe("short parcel number", () => {
  it("counts 1…9999 and then starts again from 1", async () => {
    await db.execute(sql`select setval('parcel_short_number_seq', 9998)`);
    const nums: number[] = [];
    for (let i = 0; i < 3; i++) nums.push((await createParcel(parcelInput(ctx.sk.id, ctx.pp.id), { via: "ONLINE" })).shortNumber);
    expect(nums).toEqual([9999, 1, 2]);
  });
});

describe("full self-service flow Skopje → Prilep", () => {
  it("goes from online order to pickup with a PIN", async () => {
    const created = await createParcel(parcelInput(ctx.sk.id, ctx.pp.id), { via: "ONLINE" });
    expect(created.status).toBe("AWAITING_PAYMENT");
    expect(created.trackingNumber).toMatch(/^[1-9]\d{9}$/);
    expect(created.pickupPin).toMatch(/^\d{4}$/);
    expect(created.priceDenars).toBe(100);

    const paid = await payParcel(created.senderToken, "CARD_ONLINE");
    expect(paid.status).toBe("AWAITING_DROPOFF");
    expect(paid.dropoffCode).toMatch(/^\d{6}$/);
    // Paying twice (repeated payment callback) changes nothing.
    expect((await payParcel(created.senderToken, "CARD_ONLINE")).dropoffCode).toBe(paid.dropoffCode);

    const drop = await startDropoff(ctx.sk.id, paid.dropoffCode!);
    expect(drop.lockerNumber).toBe(1);
    expect((await reload(created.id)).status).toBe("AT_ORIGIN");

    const loaded = await loadParcel(created.id, ctx.sk.id, ctx.driver.id);
    expect(loaded.lockerNumber).toBe(1);
    const [skLocker1] = await db.select().from(lockers).where(eq(lockers.stationId, ctx.sk.id)).orderBy(lockers.number).limit(1);
    expect(skLocker1.parcelId).toBeNull();
    expect((await reload(created.id)).status).toBe("IN_TRANSIT");

    const unloaded = await unloadParcel(created.id, ctx.pp.id, ctx.driver.id, "LOCKER");
    expect(unloaded.lockerNumber).toBe(1);
    const ready = await reload(created.id);
    expect(ready.status).toBe("READY_FOR_PICKUP");
    expect(ready.pickupDeadline!.getTime() - ready.readyAt!.getTime()).toBe(24 * 3600_000);

    await confirmPlaced(created.id, ctx.pp.id, ctx.driver.id);
    const out = await pickupAtKiosk(ctx.pp.id, { pin: created.pickupPin });
    expect(out.lockerNumber).toBe(1);
    expect((await reload(created.id)).status).toBe("PICKED_UP");

    const mails = await db.select().from(notifications).where(eq(notifications.parcelId, created.id));
    const subjects = mails.map((m) => `${m.recipient}: ${m.subject}`);
    expect(subjects).toEqual([
      `marko@example.com: Пратка ${created.trackingNumber} — потврда`,
      `ana@example.com: Пратката ${created.trackingNumber} ве чека`,
      `marko@example.com: Пратката ${created.trackingNumber} е подигната`,
    ]);
    expect(mails[1].body).toContain("сандак 1 на Прилеп");
    expect(mails[1].body).toContain(created.pickupPin);
  });

  it("does not open a Prilep locker with a PIN typed in Skopje", async () => {
    const { parcel } = await droppedOffInSkopje();
    await loadParcel(parcel.id, ctx.sk.id, ctx.driver.id);
    await unloadParcel(parcel.id, ctx.pp.id, ctx.driver.id, "LOCKER");
    await expectError(pickupAtKiosk(ctx.sk.id, { pin: parcel.pickupPin }), "INVALID_CODE");
  });

  it("lets the sender back out when the parcel doesn't fit, keeping the code", async () => {
    const { parcel } = await droppedOffInSkopje();
    await cancelDropoff(ctx.sk.id, parcel.id);
    expect((await reload(parcel.id)).status).toBe("AWAITING_DROPOFF");
    const again = await startDropoff(ctx.sk.id, parcel.dropoffCode!);
    expect(again.lockerNumber).toBe(1);
  });
});

describe("counter flow Prilep → Skopje", () => {
  it("accepts at the counter and is collected by QR token", async () => {
    const p = await createParcel(parcelInput(ctx.pp.id, ctx.sk.id, { size: "M", weightKg: 7 }), { via: "COUNTER", userId: ctx.counter.id, payment: "CASH" });
    expect(p.status).toBe("AT_ORIGIN");
    expect(p.paymentStatus).toBe("PAID");
    expect(p.priceDenars).toBe(250);

    const loaded = await loadParcel(p.id, ctx.pp.id, ctx.driver.id);
    expect(loaded.lockerNumber).toBeNull();
    const unloaded = await unloadParcel(p.id, ctx.sk.id, ctx.driver.id, "LOCKER");
    expect(unloaded.lockerNumber).toBe(3); // the only medium locker
    await expectError(pickupAtKiosk(ctx.sk.id, { token: "x".repeat(32) }), "INVALID_CODE");
    const out = await pickupAtKiosk(ctx.sk.id, { token: p.pickupToken });
    expect(out.lockerNumber).toBe(3);
  });

  it("hands over at the counter after checking the PIN", async () => {
    const { parcel } = await droppedOffInSkopje();
    await loadParcel(parcel.id, ctx.sk.id, ctx.driver.id);
    await unloadParcel(parcel.id, ctx.pp.id, ctx.driver.id, "COUNTER");
    await expectError(pickupAtKiosk(ctx.pp.id, { pin: parcel.pickupPin }), "PARCEL_AT_COUNTER");
    const wrong = parcel.pickupPin === "1357" ? "2468" : "1357";
    await expectError(handoverAtCounter(parcel.id, wrong, ctx.pp.id, ctx.counter.id), "INVALID_CODE");
    await handoverAtCounter(parcel.id, parcel.pickupPin, ctx.pp.id, ctx.counter.id);
    expect((await reload(parcel.id)).status).toBe("PICKED_UP");
  });

  it("cannot leave at the counter where there is none", async () => {
    const p = await createParcel(parcelInput(ctx.pp.id, ctx.sk.id), { via: "COUNTER", userId: ctx.counter.id, payment: "CARD_POS" });
    await loadParcel(p.id, ctx.pp.id, ctx.driver.id);
    await expectError(unloadParcel(p.id, ctx.sk.id, ctx.driver.id, "COUNTER"), "INVALID_STATE");
  });
});

describe("lockers", () => {
  it("falls back to a larger locker, then reports none free", async () => {
    const numbers: number[] = [];
    for (let i = 0; i < 4; i++) numbers.push((await droppedOffInSkopje()).drop.lockerNumber);
    expect(numbers).toEqual([1, 2, 3, 4]); // S, S, then M, then L
    const created = await createParcel(parcelInput(ctx.sk.id, ctx.pp.id), { via: "ONLINE" });
    const paid = await payParcel(created.senderToken, "CARD_ONLINE");
    await expectError(startDropoff(ctx.sk.id, paid.dropoffCode!), "NO_FREE_LOCKER");
  });

  it("never gives the same locker to parallel unloads", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const p = await createParcel(parcelInput(ctx.pp.id, ctx.sk.id), { via: "COUNTER", userId: ctx.counter.id, payment: "CASH" });
      await loadParcel(p.id, ctx.pp.id, ctx.driver.id);
      ids.push(p.id);
    }
    const results = await Promise.all(ids.map((id) => unloadParcel(id, ctx.sk.id, ctx.driver.id, "LOCKER")));
    expect(new Set(results.map((r) => r.lockerNumber)).size).toBe(4);
  });

  it("moves a parcel to a larger locker", async () => {
    const p = await createParcel(parcelInput(ctx.pp.id, ctx.sk.id), { via: "COUNTER", userId: ctx.counter.id, payment: "CASH" });
    await loadParcel(p.id, ctx.pp.id, ctx.driver.id);
    await unloadParcel(p.id, ctx.sk.id, ctx.driver.id, "LOCKER");
    const moved = await moveToBiggerLocker(p.id, ctx.sk.id, ctx.driver.id);
    expect(moved.lockerNumber).toBe(3);
    expect((await reload(p.id)).size).toBe("M");
    const skLockers = await db.select().from(lockers).where(eq(lockers.stationId, ctx.sk.id)).orderBy(lockers.number);
    expect(skLockers[0].parcelId).toBeNull();
    expect(skLockers[2].parcelId).toBe(p.id);
  });
});

describe("codes and security", () => {
  it("locks the keypad for 5 minutes after 5 wrong PINs, then starts counting again", async () => {
    const { parcel } = await droppedOffInSkopje();
    await loadParcel(parcel.id, ctx.sk.id, ctx.driver.id);
    await unloadParcel(parcel.id, ctx.pp.id, ctx.driver.id, "LOCKER");
    const wrong = parcel.pickupPin === "1357" ? "2468" : "1357";
    const lefts: unknown[] = [];
    for (let i = 0; i < 4; i++) lefts.push((await expectError(pickupAtKiosk(ctx.pp.id, { pin: wrong }), "INVALID_CODE")).details.attemptsLeft);
    expect(lefts).toEqual([4, 3, 2, 1]);

    const locked = await expectError(pickupAtKiosk(ctx.pp.id, { pin: wrong }), "KEYPAD_LOCKED");
    const until = new Date(locked.details.lockedUntil as string).getTime();
    expect(Math.abs(until - (Date.now() + 5 * 60_000))).toBeLessThan(5_000);
    // Even the right PIN is refused while locked…
    await expectError(pickupAtKiosk(ctx.pp.id, { pin: parcel.pickupPin }), "KEYPAD_LOCKED");
    // …and the other station's keypad is unaffected.
    await expectError(pickupAtKiosk(ctx.sk.id, { pin: wrong }), "INVALID_CODE");

    // Six minutes later the lock is over and the count starts from zero.
    await db.execute(sql`update code_attempts set created_at = created_at - interval '6 minutes'`);
    expect((await expectError(pickupAtKiosk(ctx.pp.id, { pin: wrong }), "INVALID_CODE")).details.attemptsLeft).toBe(4);
    expect((await pickupAtKiosk(ctx.pp.id, { pin: parcel.pickupPin })).lockerNumber).toBe(1);
  });

  it("locks staff login after 5 wrong passwords", async () => {
    for (let i = 0; i < 4; i++) await expectError(verifyLogin("vozac", "wrong"), "LOGIN_FAILED");
    await expectError(verifyLogin("vozac", "wrong"), "LOGIN_LOCKED");
    await expectError(verifyLogin("vozac", "secret-password"), "LOGIN_LOCKED");
    // Other accounts can still sign in.
    expect((await verifyLogin("salter", "secret-password")).username).toBe("salter");
  });

  it("gives every active parcel to one station a different PIN", async () => {
    const pins = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const p = await createParcel(parcelInput(ctx.sk.id, ctx.pp.id), { via: "ONLINE" });
      pins.add(p.pickupPin);
    }
    expect(pins.size).toBe(40);
  });

  it("checks staff passwords and service PINs", async () => {
    expect((await verifyLogin("VOZAC", "secret-password")).username).toBe("vozac");
    await expectError(verifyLogin("vozac", "wrong"), "LOGIN_FAILED");
    expect((await verifyServicePin(ctx.sk.id, "246810")).username).toBe("vozac");
    await expectError(verifyServicePin(ctx.sk.id, "111111"), "INVALID_CODE");
  });
});

describe("sweeper", () => {
  it("expires uncollected parcels and lets the driver remove them", async () => {
    const { parcel } = await droppedOffInSkopje();
    await loadParcel(parcel.id, ctx.sk.id, ctx.driver.id);
    await unloadParcel(parcel.id, ctx.pp.id, ctx.driver.id, "LOCKER");
    await db.update(parcels).set({ pickupDeadline: new Date(Date.now() - 1000) }).where(eq(parcels.id, parcel.id));
    await sweep({ force: true });
    expect((await reload(parcel.id)).status).toBe("EXPIRED");
    await expectError(pickupAtKiosk(ctx.pp.id, { pin: parcel.pickupPin }), "PARCEL_EXPIRED");
    const removed = await removeExpired(parcel.id, ctx.pp.id, ctx.driver.id);
    expect(removed.lockerNumber).toBe(1);
    expect((await reload(parcel.id)).status).toBe("RETURNED");
    const mails = await db.select().from(notifications).where(eq(notifications.parcelId, parcel.id));
    expect(mails.filter((m) => m.subject.startsWith("Истече")).length).toBe(2);
  });

  it("cancels unpaid parcels and notifies recipients the driver forgot", async () => {
    const unpaid = await createParcel(parcelInput(ctx.sk.id, ctx.pp.id), { via: "ONLINE" });
    await db.update(parcels).set({ createdAt: new Date(Date.now() - 2 * 3600_000) }).where(eq(parcels.id, unpaid.id));

    const { parcel } = await droppedOffInSkopje();
    await loadParcel(parcel.id, ctx.sk.id, ctx.driver.id);
    await unloadParcel(parcel.id, ctx.pp.id, ctx.driver.id, "LOCKER");
    await db.update(parcels).set({ readyAt: new Date(Date.now() - 10 * 60_000) }).where(eq(parcels.id, parcel.id));

    await sweep({ force: true });
    expect((await reload(unpaid.id)).status).toBe("CANCELLED");
    expect((await reload(parcel.id)).readyNotifiedAt).not.toBeNull();
    const ready = await db.select().from(notifications).where(eq(notifications.recipient, "ana@example.com"));
    expect(ready.length).toBe(1);
  });
});
