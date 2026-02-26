import { getOpsEnv } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const { baseUrl, adminKey } = getOpsEnv(event);
  const query = getQuery(event);

  const status = typeof query.status === "string" ? query.status : "Pending";
  const take = typeof query.take === "string" ? query.take : "200";

  const url = new URL(`${baseUrl}/api/wallet/admin/topups`);
  url.searchParams.set("status", status);
  url.searchParams.set("take", take);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Admin-Key": adminKey,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const text = await res.text();

  if (!res.ok) {
    setResponseStatus(event, res.status);
    return { error: "Failed to load topups", detail: text };
  }

  if (!text.trim()) {
    return { items: [] };
  }

  try {
    const data = JSON.parse(text) as { items?: unknown[]; Items?: unknown[] };
    return { items: data.items ?? data.Items ?? [] };
  } catch {
    setResponseStatus(event, 502);
    return { error: "Topups endpoint returned non-JSON response", detail: text };
  }
});
