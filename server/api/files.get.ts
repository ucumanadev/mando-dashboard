import fs from "node:fs/promises";
import path from "node:path";

function contentTypeForExt(ext: string) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const raw = typeof query.path === "string" ? query.path : "";
  const config = useRuntimeConfig(event);

  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: "Missing path" });
  }

  const safeRelative = path.posix
    .normalize(raw)
    .replace(/^(\.\.(\/|\\|$))+/, "");

  const fullPath = path.join(config.imgRoot, safeRelative);
  const resolvedRoot = path.resolve(config.imgRoot);
  const resolvedFull = path.resolve(fullPath);

  if (!resolvedFull.startsWith(resolvedRoot + path.sep)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid path" });
  }

  try {
    const buf = await fs.readFile(resolvedFull);
    const ext = path.extname(resolvedFull).toLowerCase();

    setHeader(event, "Content-Type", contentTypeForExt(ext));
    setHeader(event, "Cache-Control", "no-store");
    return buf;
  } catch (err: unknown) {
    setResponseStatus(event, 404);
    return {
      error: "File not found",
      detail: (err as Error).message,
      fullPathTried: resolvedFull
    };
  }
});
