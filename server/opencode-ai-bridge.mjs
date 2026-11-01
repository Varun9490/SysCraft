import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const PORT = 8787;
const HOST = "127.0.0.1";
const MAX_BODY = 48 * 1024;
const TIMEOUT_MS = 60000;
const MODEL = "opencode/deepseek-v4.1-flash-free";

let busy = false;

function setCors(res, req) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin === "null" ? "*" : origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

function coerceSeverity(value) {
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    if (["critical", "high", "error", "severe", "fatal"].includes(v)) return "critical";
    if (["warn", "warning", "medium", "moderate"].includes(v)) return "warn";
    if (["info", "low", "note", "debug", "trace"].includes(v)) return "info";
  }
  if (typeof value === "number") {
    if (value >= 3) return "critical";
    if (value >= 2) return "warn";
    return "info";
  }
  return "info";
}

function coerceFindings(input) {
  if (!Array.isArray(input)) return null;
  const findings = [];
  for (let i = 0; i < input.length; i++) {
    const entry = input[i];
    if (!entry || typeof entry !== "object") continue;
    const row = entry;
    findings.push({
      severity: coerceSeverity(row.severity),
      area: typeof row.area === "string" ? row.area.slice(0, 80) : "Review",
      message: typeof row.message === "string" ? row.message.slice(0, 500) : "",
      recommendation: typeof row.recommendation === "string" ? row.recommendation.slice(0, 500) : "",
    });
  }
  return findings.length > 0 ? findings : null;
}

function findJsonArrays(text) {
  const results = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "[") {
      let depth = 0;
      let inStr = false;
      let esc = false;
      let j = i;
      for (; j < text.length; j++) {
        const ch = text[j];
        if (inStr) {
          if (esc) { esc = false; continue; }
          if (ch === "\\") { esc = true; continue; }
          if (ch === '"') inStr = false;
        } else {
          if (ch === '"') inStr = true;
          else if (ch === "[") depth++;
          else if (ch === "]") { depth--; if (depth === 0) break; }
        }
      }
      if (j < text.length) {
        const slice = text.slice(i, j + 1);
        try { results.push(JSON.parse(slice)); } catch { /* skip */ }
        i = j + 1;
        continue;
      }
      break;
    }
    i++;
  }
  return results;
}

function collectTextPayloads(text) {
  const payloads = [text];
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      const visit = (value, depth) => {
        if (depth > 5) return;
        if (typeof value === "string") { payloads.push(value); return; }
        if (Array.isArray(value)) { value.forEach((v) => visit(v, depth + 1)); return; }
        if (value && typeof value === "object") {
          for (const [key, val] of Object.entries(value)) {
            if (typeof val === "string" && /text|content|message|output|response|assistant|result|delta/i.test(key)) {
              payloads.push(val);
            }
            visit(val, depth + 1);
          }
        }
      };
      visit(obj, 0);
    } catch {
      /* not json */
    }
  }
  return payloads;
}

function extractFindings(text) {
  const payloads = collectTextPayloads(text);
  for (const payload of payloads) {
    for (const arr of findJsonArrays(payload)) {
      const findings = coerceFindings(arr);
      if (findings) return findings;
    }
    try {
      const parsed = JSON.parse(payload);
      const findings = coerceFindings(parsed);
      if (findings) return findings;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const value of Object.values(parsed)) {
          const nested = coerceFindings(value);
          if (nested) return nested;
        }
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  setCors(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, model: MODEL });
    return;
  }

  if (req.method === "POST" && req.url === "/review") {
    if (busy) {
      sendJson(res, 429, { error: "bridge busy" });
      return;
    }

    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        tooLarge = true;
        try { sendJson(res, 400, { error: "body too large" }); } catch { /* ignore */ }
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", async () => {
      if (tooLarge) {
        sendJson(res, 400, { error: "body too large" });
        return;
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        sendJson(res, 400, { error: "invalid json" });
        return;
      }
      if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.brief !== "object" || body.brief === null || Array.isArray(body.brief)) {
        sendJson(res, 400, { error: "invalid brief" });
        return;
      }

      busy = true;
      const tmpFile = path.join(os.tmpdir(), `syscraft-brief-${crypto.randomUUID()}.json`);
      try {
        await fs.writeFile(tmpFile, JSON.stringify(body.brief));
      } catch {
        busy = false;
        sendJson(res, 500, { error: "could not write brief" });
        return;
      }

      const cmd = process.platform === "win32" ? "opencode.cmd" : "opencode";
      const args = ["run", "--standalone", "--model", MODEL, "--format", "json", "--file", tmpFile, "Read the attached brief. Reply with a JSON array only. Do not use tools."];

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const child = spawn(cmd, args, { shell: false, windowsHide: true });

      const timer = setTimeout(() => {
        timedOut = true;
        try { child.kill("SIGTERM"); } catch { /* ignore */ }
        setTimeout(() => { try { child.kill("SIGKILL"); } catch { /* ignore */ } }, 2000);
      }, TIMEOUT_MS);

      child.stdout.on("data", (d) => { stdout += d.toString(); });
      child.stderr.on("data", (d) => { stderr += d.toString(); });

      child.on("error", (err) => {
        clearTimeout(timer);
        busy = false;
        fs.unlink(tmpFile).catch(() => {});
        sendJson(res, 502, { error: "could not start opencode" });
      });

      child.on("close", async () => {
        clearTimeout(timer);
        await fs.unlink(tmpFile).catch(() => {});
        if (timedOut) {
          busy = false;
          sendJson(res, 504, { error: "model timed out" });
          return;
        }
        const findings = extractFindings(stdout);
        busy = false;
        if (!findings) {
          sendJson(res, 502, { error: "model did not return findings" });
          return;
        }
        sendJson(res, 200, { findings });
      });
    });
    req.on("error", () => {
      /* ignore */
    });
    return;
  }

  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  // no logging of briefs or model output
});

server.on("error", (err) => {
  process.stderr.write(`bridge error: ${err.message}\n`);
});