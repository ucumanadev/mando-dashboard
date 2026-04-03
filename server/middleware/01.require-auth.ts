import { requireSupabaseSession } from "~~/server/utils/requireSupabaseSession";

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) return;
  await requireSupabaseSession(event);
});
