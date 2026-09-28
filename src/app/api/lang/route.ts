import { cookies } from "next/headers";
import { isLang, LANG_COOKIE } from "@/i18n";
import { AppError } from "@/lib/errors";
import { readJson, route } from "@/lib/http";

export const POST = route(async (req) => {
  const { lang } = await readJson(req);
  if (!isLang(lang)) throw new AppError("VALIDATION");
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return { ok: true };
});
