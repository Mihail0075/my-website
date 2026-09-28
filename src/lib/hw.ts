import { db } from "@/db";
import { eq } from "drizzle-orm";
import { stations } from "@/db/schema";
import { hmac, safeEqual } from "@/lib/codes";
import { AppError } from "@/lib/errors";

/** Authenticate a locker controller by station code + its secret key header. */
export async function requireController(req: Request, code: string): Promise<string> {
  const key = req.headers.get("x-controller-key") ?? "";
  const [station] = await db.select().from(stations).where(eq(stations.code, code.toUpperCase())).limit(1);
  if (!station?.controllerKeyHmac || !key || !safeEqual(hmac(key), station.controllerKeyHmac)) {
    throw new AppError("UNAUTHORIZED");
  }
  return station.id;
}
