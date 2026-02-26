import { getOpsEnv } from "~~/server/utils/opsEnv";

function extractItems(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  const candidates = [
    obj.items,
    obj.Items,
    obj.results,
    obj.Results,
    obj.users,
    obj.Users,
    obj.data
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return null;
}

export default defineEventHandler(async (event) => {
  try {
    const { baseUrl, adminKey } = getOpsEnv(event);
    const query = getQuery(event);

    const q = typeof query.q === "string" ? query.q.trim() : "";
    const take = typeof query.take === "string" ? query.take : "25";

    if (q.length < 2) return { items: [] };

    const encodedQ = encodeURIComponent(q);
    const encodedTake = encodeURIComponent(take);

    const urls = [
      `${baseUrl}/api/admin/users/search?q=${encodedQ}&take=${encodedTake}`,
      `${baseUrl}/api/admin/drivers/search?q=${encodedQ}&take=${encodedTake}`
    ];

    let lastError: { status: number; detail: string } | null = null;

    for (const url of urls) {
      const res = await fetch(url, {
        headers: { "X-Admin-Key": adminKey },
        cache: "no-store"
      });

      const text = await res.text();
      const parsed = text.trim() ? JSON.parse(text) : {};

      if (!res.ok) {
        lastError = {
          status: res.status,
          detail:
            (parsed as any)?.error ||
            (parsed as any)?.detail ||
            text ||
            res.statusText
        };
        continue;
      }

      const items = extractItems(parsed);
      if (items) return { items };

      // Some deployments return bare booleans from one endpoint.
      if (typeof parsed === "boolean") continue;

      // Keep compatibility with Next behavior for unexpected object shapes.
      if (parsed && typeof parsed === "object") return parsed;
    }

    if (lastError) {
      setResponseStatus(event, lastError.status);
      return {
        error: "Backend returned error",
        detail: lastError.detail,
        status: lastError.status
      };
    }

    return { items: [] };
  } catch (err: any) {
    setResponseStatus(event, 500);
    return { error: err?.message ?? "Unexpected error" };
  }
});
