import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";
import { lockers, stations, users, type LockerSize } from "@/db/schema";
import { hmac } from "@/lib/codes";
import { hashPassword } from "@/lib/password";

let migrated = false;

/** Fresh database: two stations with a handful of lockers each, one driver and one counter user. */
export async function resetDb(layout: { size: LockerSize; count: number }[] = [
  { size: "S", count: 2 },
  { size: "M", count: 1 },
  { size: "L", count: 1 },
]) {
  if (!migrated) {
    await migrate(db, { migrationsFolder: "drizzle" });
    migrated = true;
  }
  await db.execute(
    sql`truncate table code_attempts, locker_commands, notifications, parcel_events, lockers, sessions, parcels, users, stations restart identity cascade`,
  );
  const [pp] = await db
    .insert(stations)
    .values({ code: "PP", nameMk: "Прилеп", nameEn: "Prilep", addressMk: "АС Прилеп", addressEn: "Prilep BS", hasCounter: true })
    .returning();
  const [sk] = await db
    .insert(stations)
    .values({ code: "SK", nameMk: "Скопје", nameEn: "Skopje", addressMk: "АС Скопје", addressEn: "Skopje BS", hasCounter: false })
    .returning();
  for (const station of [pp, sk]) {
    let number = 1;
    await db.insert(lockers).values(layout.flatMap(({ size, count }) => Array.from({ length: count }, () => ({ stationId: station.id, number: number++, size }))));
  }
  const passwordHash = await hashPassword("secret-password");
  const [driver] = await db.insert(users).values({ username: "vozac", name: "Возач", role: "DRIVER", passwordHash, servicePinHmac: hmac("246810") }).returning();
  const [counter] = await db.insert(users).values({ username: "salter", name: "Шалтер", role: "COUNTER", stationId: pp.id, passwordHash }).returning();
  return { pp, sk, driver, counter };
}

export function parcelInput(originStationId: string, destinationStationId: string, overrides: Record<string, unknown> = {}) {
  return {
    originStationId,
    destinationStationId,
    size: "S",
    weightKg: 1.5,
    senderName: "Марко Петровски",
    senderPhone: "070 123 456",
    senderEmail: "marko@example.com",
    recipientName: "Ана Трајковска",
    recipientPhone: "+389 71 234 567",
    recipientEmail: "ana@example.com",
    ...overrides,
  };
}
