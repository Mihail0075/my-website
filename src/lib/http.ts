import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/** Reject cross-site form posts: state-changing browser requests must come from our own pages. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new AppError("BAD_ORIGIN");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("BAD_ORIGIN");
  }
  if (originHost !== host) throw new AppError("BAD_ORIGIN");
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    throw new AppError("VALIDATION");
  }
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Wrap a route handler: same-origin check for mutations, JSON output and
 * stable error codes (the client translates them).
 */
export function route<C>(fn: (req: Request, ctx: C) => Promise<unknown>, opts: { sameOrigin?: boolean } = {}) {
  return async (req: Request, ctx: C) => {
    try {
      if (opts.sameOrigin !== false && req.method !== "GET") assertSameOrigin(req);
      const result = await fn(req, ctx);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ error: err.code, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
    }
  };
}
