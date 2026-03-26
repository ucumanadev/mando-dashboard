import { getOpsEnv } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const { baseUrl, adminKey } = getOpsEnv(event);
  const query = getQuery(event);
  const path = typeof query.path === "string" ? query.path : "";

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: "Missing proof path" });
  }

  const sanitizedPath = path.replace(/^\/+/, "");
  const url = `${baseUrl.replace(/\/+$/, "")}/${sanitizedPath}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Admin-Key": adminKey,
      Accept: "image/*,*/*"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw createError({
      statusCode: res.status,
      statusMessage: "Unable to fetch proof image"
    });
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  setHeader(event, "Content-Type", contentType);
  setHeader(event, "Cache-Control", "no-store");

  const arr = await res.arrayBuffer();
  return new Uint8Array(arr);
});
