import { getOpsEnv, getOpsHeaders } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const { baseUrl } = getOpsEnv(event);
  const query = getQuery(event);
  const path = typeof query.path === "string" ? query.path : "";

  if (!path) {
    throw createError({ statusCode: 400, statusMessage: "Missing proof path" });
  }

  const sanitizedPath = path.replace(/^\/+/, "");
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/api/wallet/admin/topups/proof-file`);
  url.searchParams.set("path", sanitizedPath);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getOpsHeaders(event, { accept: "image/*,*/*" }),
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
