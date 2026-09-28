import { createSession } from "@/lib/auth";
import { SESSION_HOURS } from "@/lib/config";
import { readJson, route, str } from "@/lib/http";
import { verifyLogin } from "@/lib/services/staff";

export const POST = route(async (req) => {
  const { username, password } = await readJson(req);
  const user = await verifyLogin(str(username), str(password));
  await createSession(user.id, { minutes: SESSION_HOURS * 60 });
  return { role: user.role };
});
