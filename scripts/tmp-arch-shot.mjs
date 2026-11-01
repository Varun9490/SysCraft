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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4321/cloud', { waitUntil: 'load' });
await page.waitForTimeout(1200);

const section = page.locator('section', { has: page.locator('#arch-visualizer-heading') }).first();
await section.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await section.screenshot({ path: 'shots/arch-visualizer-aws.png' });

for (const tab of ['Cloudflare edge', 'Kubernetes', 'Zero trust']) {
  await page.getByRole('tab', { name: new RegExp(tab) }).click();
  await page.waitForTimeout(500);
  await section.screenshot({ path: `shots/arch-visualizer-${tab.toLowerCase().replace(/\s+/g, '-')}.png` });
}

// exercise a couple of interactions on the AWS tab
await page.getByRole('tab', { name: /AWS Multi-AZ/ }).click();
await page.waitForTimeout(300);
await page.getByRole('switch', { name: /Simulate AZ-1a failure/ }).click();
await page.getByRole('switch', { name: /gateway VPC endpoint/ }).click();
await page.waitForTimeout(400);
await section.screenshot({ path: 'shots/arch-visualizer-aws-failure.png' });

const measured = await page.evaluate(() => {
  const svgs = Array.from(document.querySelectorAll('#arch-visualizer-heading ~ * svg, section svg'));
  return svgs.map((s) => ({ w: Math.round(s.getBoundingClientRect().width), h: Math.round(s.getBoundingClientRect().height) }));
});
console.log(JSON.stringify({ errors, measured }, null, 2));

await browser.close();
server.close();
