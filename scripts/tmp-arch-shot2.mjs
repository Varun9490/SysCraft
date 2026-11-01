import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const ROOT = 'C:/Users/varun/Desktop/sysDesign/out';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (path === '' || path.endsWith('/')) path += 'index.html';
    let file = join(ROOT, path);
    try {
      await readFile(file);
    } catch {
      file = join(ROOT, `${path}.html`);
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('nope');
  }
});

await new Promise((r) => server.listen(4321, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const failed = [];
page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

await page.goto('http://localhost:4321/cloud', { waitUntil: 'load' });
await page.waitForTimeout(800);
await page.getByRole('tab', { name: /Kubernetes/ }).click();
await page.waitForTimeout(500);

const svg = page.locator('svg[aria-label="Kubernetes control plane and eBPF data plane schematic"]');
await svg.screenshot({ path: 'shots/tmp-k8s-svg.png' });

const rects = await page.evaluate(() => {
  const svgEl = document.querySelector('svg[aria-label="Kubernetes control plane and eBPF data plane schematic"]');
  return Array.from(svgEl.querySelectorAll('rect')).map((r) => ({
    x: r.getAttribute('x'), y: r.getAttribute('y'), w: r.getAttribute('width'), h: r.getAttribute('height'),
    stroke: r.getAttribute('stroke'), dash: r.getAttribute('stroke-dasharray'),
  }));
});
console.log(JSON.stringify({ failed: failed.slice(0, 10), rects }, null, 2));

await browser.close();
server.close();
