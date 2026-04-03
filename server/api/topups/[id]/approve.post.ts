import { getOpsEnv, getOpsHeaders } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const { baseUrl } = getOpsEnv(event);

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing topup id" });
  }

  const url = `${baseUrl}/api/wallet/admin/topups/${encodeURIComponent(id)}/approve`;

  const res = await fetch(url, {
    method: "POST",
    headers: getOpsHeaders(event, { json: true, accept: "application/json" }),
    body: JSON.stringify({ note: "approved via ops ui" }),
    cache: "no-store"
  });

  if (res.status === 204) return { ok: true };

  const text = await res.text();

  if (!res.ok) {
    setResponseStatus(event, res.status);
    return { error: "Approve failed", detail: text };
  }

  if (!text.trim()) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, detail: text };
  }
});
