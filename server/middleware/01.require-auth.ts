import { requireSupabaseSession } from "~~/server/utils/requireSupabaseSession";

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/")) return;
  if (event.path.startsWith("/api/public/")) return;
  await requireSupabaseSession(event);
});
