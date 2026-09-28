import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, stations, users, type User, type UserRole } from "@/db/schema";
import { hmac, newToken, safeEqual, sha256 } from "@/lib/codes";
import { AppError } from "@/lib/errors";

const SESSION_COOKIE = "bp_session";
const KIOSK_COOKIE = "bp_kiosk";
const secure = process.env.NODE_ENV === "production";

export type StaffSession = { user: Omit<User, "passwordHash" | "servicePinHmac">; kioskStationId: string | null };

export async function createSession(userId: string, opts: { minutes: number; kioskStationId?: string }) {
  const token = newToken(32);
  const expiresAt = new Date(Date.now() + opts.minutes * 60_000);
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt, kioskStationId: opts.kioskStationId ?? null });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<StaffSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ user: users, kioskStationId: sessions.kioskStationId })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true)))
    .limit(1);
  if (!row) return null;
  const { passwordHash: _p, servicePinHmac: _s, ...user } = row.user;
  return { user, kioskStationId: row.kioskStationId };
}

/** For route handlers: the signed-in staff member, or an UNAUTHORIZED/FORBIDDEN error. */
export async function requireStaff(roles?: UserRole[]): Promise<StaffSession> {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHORIZED");
  if (roles && !roles.includes(session.user.role) && session.user.role !== "ADMIN") throw new AppError("FORBIDDEN");
  return session;
}

/** For pages: redirect to the login page instead of throwing. */
export async function requireStaffPage(roles?: UserRole[]): Promise<StaffSession> {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (roles && !roles.includes(session.user.role) && session.user.role !== "ADMIN") redirect("/staff");
  return session;
}

/**
 * A kiosk session (driver signed in with a service PIN) may only act at its
 * own station; regular sessions may act anywhere their role allows.
 */
export function assertStationAllowed(session: StaffSession, stationId: string) {
  if (session.kioskStationId && session.kioskStationId !== stationId) throw new AppError("FORBIDDEN");
  if (session.user.role === "COUNTER" && session.user.stationId !== stationId) throw new AppError("FORBIDDEN");
}

// ---------------------------------------------------------------------------
// Kiosk devices: a signed cookie binds a browser to one station.
// ---------------------------------------------------------------------------

function kioskSignature(stationId: string, epoch: number) {
  return hmac(`kiosk:${stationId}:${epoch}`);
}

export async function registerKioskDevice(stationId: string) {
  const [station] = await db.select().from(stations).where(eq(stations.id, stationId)).limit(1);
  if (!station) throw new AppError("NOT_FOUND");
  const value = `${station.id}.${station.kioskEpoch}.${kioskSignature(station.id, station.kioskEpoch)}`;
  (await cookies()).set(KIOSK_COOKIE, value, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
}

/** Station id of the kiosk this browser is registered as, or null. */
export async function getKioskStationId(): Promise<string | null> {
  const value = (await cookies()).get(KIOSK_COOKIE)?.value;
  if (!value) return null;
  const [stationId, epochRaw, sig] = value.split(".");
  const epoch = Number(epochRaw);
  if (!stationId || !sig || !Number.isInteger(epoch)) return null;
  if (!safeEqual(sig, kioskSignature(stationId, epoch))) return null;
  const [station] = await db.select({ epoch: stations.kioskEpoch }).from(stations).where(eq(stations.id, stationId)).limit(1);
  return station && station.epoch === epoch ? stationId : null;
}

export async function requireKiosk(): Promise<string> {
  const stationId = await getKioskStationId();
  if (!stationId) throw new AppError("KIOSK_NOT_REGISTERED");
  return stationId;
}
