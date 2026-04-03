import type { H3Event } from "h3";
import { getCookie, getHeader } from "h3";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "~/constants/auth";

export function getOpsEnv(event: H3Event) {
  const config = useRuntimeConfig(event);

  // Match Next.js behavior with runtime config first, then env fallbacks.
  const baseUrl =
    config.motoApiBaseUrl ||
    process.env.MOTO_API_BASE_URL ||
    process.env.OPS_API_BASE_URL ||
    process.env.NEXT_PUBLIC_MOTO_API_BASE_URL ||
    process.env.NEXT_PUBLIC_OPS_API_BASE_URL ||
    "";

  if (!baseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing env MOTO_API_BASE_URL (or OPS_API_BASE_URL)"
    });
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, "")
  };
}

export function getOpsAccessToken(event: H3Event): string | null {
  const authHeader = getHeader(event, "authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const headerToken = authHeader.slice("bearer ".length).trim();
    if (headerToken) return headerToken;
  }

  const cookieToken = getCookie(event, ADMIN_ACCESS_TOKEN_COOKIE);
  return cookieToken?.trim() ? cookieToken : null;
}

export function getOpsHeaders(
  event: H3Event,
  options?: { json?: boolean; accept?: string }
) {
  getOpsEnv(event);
  const accessToken = getOpsAccessToken(event);
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (options?.json) {
    headers["Content-Type"] = "application/json";
  }

  if (options?.accept) {
    headers.Accept = options.accept;
  }

  return headers;
}
