import fs from "node:fs/promises";
import path from "node:path";
import type { H3Event } from "h3";

export type LogKind =
  | "app"
  | "error"
  | "error-full"
  | "audit"
  | "signalr"
  | "signalr-error";

const FILE_MAP: Record<LogKind, string> = {
  app: "app-.log",
  error: "error-.log",
  "error-full": "error-full-.log",
  audit: "audit-.log",
  signalr: "signalr-.log",
  "signalr-error": "signalr-error-.log"
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
  const pattern = FILE_MAP[kind];
  const fileName = getFileNameForDate(pattern, date);
  const fullPath = path.join(getLogRoot(event), fileName);

  let text: string;
  try {
    text = await fs.readFile(fullPath, "utf8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

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
