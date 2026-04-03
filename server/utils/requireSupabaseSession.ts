import type { H3Event } from "h3";
import { getOpsAccessToken } from "~~/server/utils/opsEnv";

type SupabaseUser = {
  id: string;
  email?: string;
};

export async function requireSupabaseSession(event: H3Event) {
  const token = getOpsAccessToken(event);
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing Supabase session token"
    });
  }

  const config = useRuntimeConfig(event);
  const supabaseUrl = config.public.supabaseUrl;
  const supabaseAnonKey = config.public.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Missing SUPABASE_URL or SUPABASE_ANON_KEY"
    });
  }

  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid Supabase session"
    });
  }

  const user = (await res.json()) as SupabaseUser;
  event.context.adminUser = user;
  return user;
}
