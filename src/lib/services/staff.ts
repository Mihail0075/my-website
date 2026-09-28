import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { CODE_LOCK_MINUTES, LOGIN_LOCK_MINUTES, MAX_CODE_ATTEMPTS, MAX_LOGIN_ATTEMPTS } from "@/lib/config";
import { hmac, isDigits } from "@/lib/codes";
import { verifyPassword } from "@/lib/password";
import { kioskScope, loginScope, withAttempts } from "./attempts";

export async function verifyLogin(username: string, password: string): Promise<User> {
  const name = username.trim().toLowerCase();
  return withAttempts(loginScope(name, MAX_LOGIN_ATTEMPTS, LOGIN_LOCK_MINUTES), async () => {
    const [user] = await db.select().from(users).where(and(eq(users.username, name), eq(users.active, true))).limit(1);
    // Hash anyway so a missing user takes as long as a wrong password.
    const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(88));
    return user && ok ? user : null;
  });
}

/** Driver (or admin) signs in at a kiosk with their 6-digit service PIN. */
export async function verifyServicePin(stationId: string, pin: string): Promise<User> {
  return withAttempts(kioskScope("SERVICE_PIN", stationId, MAX_CODE_ATTEMPTS, CODE_LOCK_MINUTES), async () => {
    if (!isDigits(pin, 6)) return null;
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.servicePinHmac, hmac(pin)), eq(users.active, true), inArray(users.role, ["DRIVER", "ADMIN"])))
      .limit(1);
    return user ?? null;
  });
}

export async function listUsers() {
  return db
    .select({ id: users.id, username: users.username, name: users.name, role: users.role, stationId: users.stationId, active: users.active, servicePinHmac: users.servicePinHmac })
    .from(users)
    .orderBy(asc(users.role), asc(users.username));
}
