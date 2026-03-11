import { getOpsEnv } from "~~/server/utils/opsEnv";

type Body = {
  status?: string;
};

export default defineEventHandler(async (event) => {
  const { baseUrl, adminKey } = getOpsEnv(event);
  const id = getRouterParam(event, "id");
  const documentId = getRouterParam(event, "documentId");
  const body = await readBody<Body>(event);
  const status = (body?.status ?? "").trim().toLowerCase();

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing driver id" });
  }
  if (!documentId) {
    throw createError({ statusCode: 400, statusMessage: "Missing document id" });
  }
  if (!status) {
    throw createError({ statusCode: 400, statusMessage: "Missing status" });
  }

  const url = `${baseUrl}/api/admin/users/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/status`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "X-Admin-Key": adminKey,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ status }),
    cache: "no-store"
  });

  const text = await res.text();
  const data = text.trim() ? JSON.parse(text) : {};

  if (!res.ok) {
    setResponseStatus(event, res.status);
    return {
      error: "Update status failed",
      detail: (data as any)?.error || (data as any)?.detail || text || res.statusText,
      status: res.status
    };
  }

  return data;
});
