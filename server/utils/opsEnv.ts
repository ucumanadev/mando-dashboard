import type { H3Event } from "h3";

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

  const adminKey =
    config.motoAdminKey ||
    process.env.MOTO_ADMIN_KEY ||
    process.env.OPS_ADMIN_KEY ||
    "";

  if (!baseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing env MOTO_API_BASE_URL (or OPS_API_BASE_URL)"
    });
  }

  if (!adminKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing env MOTO_ADMIN_KEY (or OPS_ADMIN_KEY)"
    });
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    adminKey
  };
}
