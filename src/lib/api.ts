/** Client-side JSON helper; throws ApiError with the server's error code. */
export class ApiError extends Error {
  constructor(
    public code: string,
    public details: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

export async function api<T = unknown>(path: string, body?: unknown, method?: "GET" | "POST"): Promise<T> {
  const res = await fetch(path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "INTERNAL", data.details ?? {});
  return data as T;
}
