import { getOpsEnv, getOpsHeaders } from "~~/server/utils/opsEnv";

type CreateDriverOffersBody = {
  count?: number;
  basePrice?: number;
  priceStep?: number;
  driverNamePrefix?: string;
  rating?: string;
  avatar?: string;
};

export default defineEventHandler(async (event) => {
  const { baseUrl } = getOpsEnv(event);
  const requestId = getRouterParam(event, "requestId");

  if (!requestId) {
    throw createError({ statusCode: 400, statusMessage: "Missing requestId" });
  }

  const body = await readBody<CreateDriverOffersBody>(event);
  const url = `${baseUrl}/api/dev/testing/ride-requests/${requestId}/driver-offers/create`;

  const res = await fetch(url, {
    method: "POST",
    headers: getOpsHeaders(event, { json: true, accept: "application/json" }),
    body: JSON.stringify(body ?? {}),
    cache: "no-store"
  });

  const text = await res.text();

  if (!res.ok) {
    setResponseStatus(event, res.status);
    return {
      error: "Failed to create test driver offers",
      detail: text
    };
  }

  if (!text.trim()) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, detail: text };
  }
});
