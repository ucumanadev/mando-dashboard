import { getOpsEnv, getOpsHeaders } from "~~/server/utils/opsEnv";

type CreateRideRequestsBody = {
  count?: number;
  offeredPrice?: number;
  paymentMethod?: "cash" | "yape" | "plin" | string;
  passengerNamePrefix?: string;
  scatterKm?: number;
  pickup?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  destination?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
};

export default defineEventHandler(async (event) => {
  const { baseUrl } = getOpsEnv(event);
  const body = await readBody<CreateRideRequestsBody>(event);

  const url = `${baseUrl}/api/dev/testing/ride-requests/create`;

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
      error: "Failed to create test ride requests",
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
