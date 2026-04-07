import fs from "node:fs/promises";
import path from "node:path";
import type { H3Event } from "h3";

export type LogKind = "app" | "error";

const FILE_MAP: Record<LogKind, string[]> = {
  app: ["app-.log"],
  // Staging/production use "errors-.log" while local dev may use "error-.log".
  error: ["errors-.log", "error-.log"]
};

export type LogEvent = {
  timestamp: string;
  level: string;
  messageTemplate: string;
  exception?: string;
  properties: Record<string, unknown>;
  raw: unknown;
};

function getLogRoot(event: H3Event): string {
  const config = useRuntimeConfig(event);
  return config.logRoot;
}

function getFileNameForDate(pattern: string, date?: string): string {
  let yyyy: number;
  let mm: string;
  let dd: string;

  if (date) {
    const [y, m, d] = date.split("-");
    yyyy = Number.parseInt(y, 10);
    mm = m;
    dd = d;
  } else {
    const now = new Date();
    yyyy = now.getFullYear();
    mm = String(now.getMonth() + 1).padStart(2, "0");
    dd = String(now.getDate()).padStart(2, "0");
  }

  return pattern.replace(".log", `${yyyy}${mm}${dd}.log`);
}

export async function readLogFile(
  event: H3Event,
  kind: LogKind,
  limit = 200,
  date?: string
): Promise<LogEvent[]> {
  const patterns = FILE_MAP[kind] ?? [];
  const candidates = patterns.map((pattern) =>
    path.join(getLogRoot(event), getFileNameForDate(pattern, date))
  );

  let text: string | null = null;
  for (const fullPath of candidates) {
    try {
      text = await fs.readFile(fullPath, "utf8");
      break;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw err;
    }
  }

  if (!text) return [];

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-limit);

  const events: LogEvent[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;

      const {
        ["@t"]: t,
        ["@mt"]: mt,
        ["@l"]: l,
        ["@x"]: x,
        ...rest
      } = obj;

      events.push({
        timestamp: typeof t === "string" ? t : "",
        level: typeof l === "string" ? l : "Information",
        messageTemplate: typeof mt === "string" ? mt : "",
        exception: typeof x === "string" ? x : undefined,
        properties: rest,
        raw: obj
      });
    } catch {
      // Ignore non-JSON lines.
    }
  }

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return events.reverse();
}
