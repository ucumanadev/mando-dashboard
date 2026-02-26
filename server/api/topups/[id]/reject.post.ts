import { getOpsEnv } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const { baseUrl, adminKey } = getOpsEnv(event);

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing topup id" });
  }

  const url = `${baseUrl}/api/wallet/admin/topups/${encodeURIComponent(id)}/reject`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Admin-Key": adminKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ note: "rejected via ops ui" }),
    cache: "no-store"
  });

  if (res.status === 204) return { ok: true };

  const text = await res.text();

  if (!res.ok) {
    setResponseStatus(event, res.status);
    return { error: "Reject failed", detail: text };
  }

  if (!text.trim()) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, detail: text };
  }
});
