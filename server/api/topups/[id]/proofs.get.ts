import { getOpsEnv, getOpsHeaders } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const { baseUrl } = getOpsEnv(event);

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing topup id" });
  }

  const url = `${baseUrl}/api/wallet/admin/topups/${encodeURIComponent(id)}/proofs`;

  const res = await fetch(url, {
    method: "GET",
    headers: getOpsHeaders(event, { accept: "application/json" }),
    cache: "no-store"
  });

  const text = await res.text();

  if (!res.ok) {
    setResponseStatus(event, res.status);
    return { error: "Failed to load topup proofs", detail: text };
  }

  if (!text.trim()) return { items: [] };

  try {
    const data = JSON.parse(text) as { items?: unknown[]; Items?: unknown[] };
    return { items: data.items ?? data.Items ?? [] };
  } catch {
    setResponseStatus(event, 502);
    return { error: "Topup proofs endpoint returned non-JSON response", detail: text };
  }
});
