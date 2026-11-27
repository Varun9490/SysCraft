import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname as pathDirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(pathDirname(fileURLToPath(import.meta.url)), "../out");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);
    const clean = normalize(pathname).replace(/^[/\\]+/, "").replace(/\\/g, "/");
    const safe = clean === "" || clean === "." ? "index.html" : clean;
    const base = join(root, safe);

    if (!base.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const isRsc = request.headers.rsc !== undefined || url.searchParams.has("_rsc");
    const candidates = isRsc
      ? [base, `${base}.txt`, join(root, `${safe}.txt`)]
      : [base, `${base}.html`, join(base, "index.html"), join(root, `${safe}.html`)];

    let file = null;
    for (const candidate of candidates) {
      if (await exists(candidate)) {
        file = candidate;
        break;
      }
    }

    if (!file) {
      const notFound = join(root, "404.html");
      const body = await readFile(notFound);
      response.writeHead(404, { "content-type": MIME[".html"], "cache-control": "no-store" });
      response.end(body);
      return;
    }

    const body = await readFile(file);
    const type = MIME[extname(file)] ?? "application/octet-stream";
    const immutable = url.pathname.startsWith("/_next/");
    response.writeHead(200, {
      "content-type": type,
      "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Static server error");
  }
});

server.listen(port, host, () => {
  console.log(`SysCraft static export: http://${host}:${port}`);
});
