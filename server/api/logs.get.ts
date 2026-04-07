import { readLogFile } from "~~/server/utils/logReader";
import type { LogKind } from "~/server/utils/logReader";

const ALLOWED: LogKind[] = ["app", "error"];

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const mode = typeof query.mode === "string" ? query.mode : "single";
  const file = typeof query.file === "string" ? (query.file as LogKind) : "app";
  const limitParam = typeof query.limit === "string" ? query.limit : "200";
  const date = typeof query.date === "string" ? query.date : undefined;

  const parsedLimit = Number.parseInt(limitParam, 10);
  const limit = Number.isNaN(parsedLimit)
    ? 200
    : Math.min(Math.max(parsedLimit, 10), 1000);

  if (mode === "all") {
    const property = typeof query.property === "string" ? query.property : "";
    const value = typeof query.value === "string" ? query.value : "";

    if (!date) {
      throw createError({
        statusCode: 400,
        statusMessage: "date is required for correlation mode"
      });
    }

    if (!property || !value) {
      throw createError({
        statusCode: 400,
        statusMessage: "property and value are required for correlation mode"
      });
    }

    const merged: Array<Record<string, unknown>> = [];

    for (const kind of ALLOWED) {
      const events = await readLogFile(event, kind, limit, date);

      for (const logEvent of events) {
        const props = logEvent.properties as Record<string, unknown>;
        const raw = props[property];
        if (raw === undefined || raw === null) continue;

        const asString = typeof raw === "string" ? raw : JSON.stringify(raw);
        if (asString !== value) continue;

        merged.push({ ...logEvent, sourceFile: kind });
      }
    }

    merged.sort((a, b) => {
      const ta = new Date(String(a.timestamp ?? "")).getTime();
      const tb = new Date(String(b.timestamp ?? "")).getTime();
      return ta - tb;
    });

    const sliced = merged.length > limit ? merged.slice(merged.length - limit) : merged;
    return { events: sliced };
  }

  if (!ALLOWED.includes(file)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid file parameter" });
  }

  const events = await readLogFile(event, file, limit, date);
  return { events };
});
