import { getOpsEnv } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const { baseUrl, adminKey } = getOpsEnv(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing driver id" });
  }

  const url = `${baseUrl}/api/admin/users/${encodeURIComponent(id)}/documents`;

  const res = await fetch(url, {
    headers: { "X-Admin-Key": adminKey },
    cache: "no-store"
  });

  const text = await res.text();
  const data = text.trim() ? JSON.parse(text) : {};

  if (!res.ok) {
    setResponseStatus(event, res.status);
    return {
      error: "Backend returned error",
      detail: (data as any)?.error || (data as any)?.detail || text || res.statusText,
      status: res.status
    };
  }

  return data;
});
