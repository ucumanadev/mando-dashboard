import { getOpsEnv, getOpsHeaders } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const { baseUrl } = getOpsEnv(event);
  const routePath = getRouterParam(event, "path");
  const parts = Array.isArray(routePath) ? routePath : routePath ? [routePath] : [];
  const joined = parts.join("/");

  if (!joined) {
    throw createError({ statusCode: 400, statusMessage: "Missing diagnostics route path" });
  }

  const method = event.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  }

  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/api/admin/${joined}`);
  const query = getQuery(event);
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, String(v));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const body = method === "POST" ? await readBody(event) : undefined;

  let res: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    res = await fetch(url.toString(), {
      method,
      headers: getOpsHeaders(event, { json: method === "POST", accept: "application/json" }),
      body: body == null || method === "GET" ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });
  } catch {
    setResponseStatus(event, 503);
    return {
      error: "Diagnostics request failed",
      detail: "Upstream server unavailable"
    };
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  if (!res.ok) {
    setResponseStatus(event, res.status);
    return {
      error: "Diagnostics request failed",
      detail: text || res.statusText
    };
  }

  if (!text.trim()) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
});
