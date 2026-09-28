import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { stations } from "@/db/schema";
import { registerKioskDevice, requireStaff } from "@/lib/auth";
import { readJson, route, str } from "@/lib/http";

/** Admin registers the current browser as a station's kiosk, or signs out all kiosks of a station. */
export const POST = route(async (req) => {
  await requireStaff(["ADMIN"]);
  const body = await readJson(req);
  const stationId = str(body.stationId);
  if (body.action === "revoke") {
    await db.update(stations).set({ kioskEpoch: sql`${stations.kioskEpoch} + 1` }).where(eq(stations.id, stationId));
    return { ok: true };
  }
  await registerKioskDevice(stationId);
  return { ok: true };
});
