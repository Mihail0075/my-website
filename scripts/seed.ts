/**
 * Creates the two stations, their lockers and the first staff accounts.
 * Safe to run more than once: existing rows are left alone.
 *
 * Passwords and PINs come from env vars when set, otherwise they are
 * generated and printed once — write them down.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { lockers, stations, users, type LockerSize } from "../src/db/schema";
import { hmac, newServicePin, newToken } from "../src/lib/codes";
import { hashPassword } from "../src/lib/password";

const STATIONS = [
  {
    code: "PP",
    nameMk: "Прилеп",
    nameEn: "Prilep",
    addressMk: "Автобуска станица Прилеп",
    addressEn: "Prilep bus station",
    hasCounter: true,
  },
  {
    code: "SK",
    nameMk: "Скопје",
    nameEn: "Skopje",
    addressMk: "Автобуска станица Скопје",
    addressEn: "Skopje bus station",
    hasCounter: false,
  },
];

// 30 lockers per station: 1–15 small, 16–25 medium, 26–30 large.
const LAYOUT: { size: LockerSize; count: number }[] = [
  { size: "S", count: 15 },
  { size: "M", count: 10 },
  { size: "L", count: 5 },
];

async function main() {
  const printed: string[] = [];

  for (const s of STATIONS) {
    let [station] = await db.select().from(stations).where(eq(stations.code, s.code));
    if (!station) {
      const controllerKey = newToken(24);
      [station] = await db.insert(stations).values({ ...s, controllerKeyHmac: hmac(controllerKey) }).returning();
      printed.push(`Controller key for ${s.code} (Raspberry Pi, header x-controller-key): ${controllerKey}`);
    }
    const existing = await db.select({ id: lockers.id }).from(lockers).where(eq(lockers.stationId, station.id));
    if (existing.length === 0) {
      let number = 1;
      const rows = LAYOUT.flatMap(({ size, count }) => Array.from({ length: count }, () => ({ stationId: station.id, number: number++, size })));
      await db.insert(lockers).values(rows);
    }
  }

  const [prilep] = await db.select().from(stations).where(eq(stations.code, "PP"));
  const accounts = [
    { username: "admin", name: "Администратор", role: "ADMIN" as const, stationId: null, pw: process.env.SEED_ADMIN_PASSWORD, pin: process.env.SEED_ADMIN_PIN },
    { username: "salter.prilep", name: "Шалтер Прилеп", role: "COUNTER" as const, stationId: prilep.id, pw: process.env.SEED_COUNTER_PASSWORD, pin: undefined },
    { username: "vozac", name: "Возач", role: "DRIVER" as const, stationId: null, pw: process.env.SEED_DRIVER_PASSWORD, pin: process.env.SEED_DRIVER_PIN },
  ];
  for (const a of accounts) {
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.username, a.username));
    if (exists) continue;
    const password = a.pw ?? newToken(9);
    const pin = a.role === "COUNTER" ? null : (a.pin ?? newServicePin());
    await db.insert(users).values({
      username: a.username,
      name: a.name,
      role: a.role,
      stationId: a.stationId,
      passwordHash: await hashPassword(password),
      servicePinHmac: pin ? hmac(pin) : null,
    });
    printed.push(`User ${a.username} (${a.role}): password ${password}${pin ? `, service PIN ${pin}` : ""}`);
  }

  console.log(printed.length ? printed.join("\n") : "Nothing to do — already seeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
