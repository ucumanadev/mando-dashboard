import { getOpsEnv } from "~~/server/utils/opsEnv";

export default defineEventHandler(async (event) => {
  const { baseUrl } = getOpsEnv(event);
  const url = `${baseUrl}/api/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    const text = await res.text();
    if (!res.ok) {
      setResponseStatus(event, res.status);
      return {
        ok: false,
        detail: text || res.statusText
      };
    }

    if (!text.trim()) {
      setResponseStatus(event, 503);
      return {
        ok: false,
        detail: "Invalid empty health response"
      };
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      setResponseStatus(event, 503);
      return {
        ok: false,
        detail: "Invalid non-JSON health response"
      };
    }

    // Only accept the canonical backend payload.
    if (data?.status !== "ok") {
      setResponseStatus(event, 503);
      return {
        ok: false,
        detail: "Health payload did not report status=ok",
        data
      };
    }

    return {
      ok: true,
      data
    };
  } catch {
    setResponseStatus(event, 503);
    return {
      ok: false,
      detail: "Upstream server unavailable"
    };
  } finally {
    clearTimeout(timeout);
  }
});
