// Headless Playwright audit for the /canvas workspace.
// Run: node scripts/canvas-audit.mjs [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:3100";
const OUT = "shots/audit";
mkdirSync(OUT, { recursive: true });

const report = [];
const log = (section, data) => {
  report.push({ section, ...data });
  console.log(`\n### ${section}\n${JSON.stringify(data, null, 2)}`);
};

const browser = await chromium.launch();

async function open(path, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".react-flow", { timeout: 30000 });
  await page.waitForTimeout(1200);
  return { context, page, errors };
}

const nodeCount = (page) => page.locator(".react-flow__node").count();

async function overlapReport(page) {
  const boxes = [];
  const count = await page.locator(".react-flow__node").count();
  for (let i = 0; i < count; i += 1) {
    const box = await page.locator(".react-flow__node").nth(i).boundingBox();
    if (box) boxes.push({ i, x: box.x, y: box.y, w: box.width, h: box.height });
  }
  const overlaps = [];
  for (let a = 0; a < boxes.length; a += 1) {
    for (let b = a + 1; b < boxes.length; b += 1) {
      const A = boxes[a];
      const B = boxes[b];
      if (A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y) {
        overlaps.push([A.i, B.i]);
      }
    }
  }
  return { nodes: boxes.length, overlaps };
}

// ── A. Desktop baseline ────────────────────────────────────────────────────
{
  const { context, page, errors } = await open("/canvas", { width: 1440, height: 900 });
  await page.screenshot({ path: `${OUT}/desktop-initial.png` });

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector(".react-flow");
    const dock = document.querySelector(".react-flow")?.parentElement?.querySelector(".z-30");
    const dockInner = dock?.firstElementChild;
    const rail = document.querySelector('aside[aria-label="Workspace palette"]');
    return {
      viewport: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      canvasWidth: canvas?.getBoundingClientRect().width ?? null,
      railWidth: rail?.getBoundingClientRect().width ?? null,
      dockScrollWidth: dockInner?.scrollWidth ?? null,
      dockClientWidth: dockInner?.clientWidth ?? null,
    };
  });
  log("desktop.layout", layout);

  // Add from left palette (three times → must not overlap)
  for (const name of [/Stateless REST Service/, /Background Worker Fleet/, /Redis Cluster Cache/]) {
    const target = page.getByRole("button", { name }).first();
    if ((await target.count()) === 0) {
      // collapsed category → expand it
      const category = await page.locator("button", { hasText: /^CACHE/ }).first();
      if (await category.count()) await category.click();
    }
    if ((await page.getByRole("button", { name }).first().count()) === 0) continue;
    await page.getByRole("button", { name }).first().click();
    await page.waitForTimeout(500);
  }
  log("palette.add", { nodes: await nodeCount(page), ...(await overlapReport(page)) });

  // Transport: fresh empty canvas starts paused
  const transport = page.locator("header button", { hasText: /^(Run|Pause)$/ }).first();
  const transportInitial = (await transport.innerText()).trim();
  const tickText = async () => {
    const node = page.getByText(/^(live|replay) · t\d+$/).first();
    return (await node.count()) ? (await node.textContent()) : null;
  };
  await transport.click();
  await page.waitForTimeout(1800);
  const pauseButtonVisible = await page.locator("header button", { hasText: /^Pause$/ }).count();
  const nodeTextRunning = await page.locator(".react-flow__node").first().innerText();
  const tickRunning = await tickText();
  log("sim.run", { transportInitial, pauseButtonVisible, nodeText: nodeTextRunning, tick: tickRunning });

  // Pause must freeze the clock and resume must continue from the same tick.
  await transport.click();
  await page.waitForTimeout(400);
  const paused = (await transport.innerText()).trim();
  const tickPausedA = await tickText();
  await page.waitForTimeout(900);
  const tickPausedB = await tickText();
  await transport.click();
  await page.waitForTimeout(800);
  const tickResumed = await tickText();
  log("sim.pauseResume", { transportAfterPause: paused, tickPausedA, tickPausedB, tickResumed });

  // Sketchy toggle
  const sketchToggle = page.locator('button[aria-label="Toggle sketchy hand-drawn blocks"]');
  const sketchVisible = await sketchToggle.count();
  if (sketchVisible) await sketchToggle.click();
  await page.waitForTimeout(700);
  const sketchFrames = await page.locator('[data-testid="sketch-frame"]').count();
  await page.screenshot({ path: `${OUT}/desktop-sketchy.png` });
  log("toolbar.sketchyToggle", { found: sketchVisible, sketchFrames });
  if (sketchVisible) await sketchToggle.click();

  // Load blueprint from panel
  await page.getByRole("button", { name: /^Blueprints$/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Load on canvas/ }).first().click();
  await page.waitForTimeout(800);
  log("blueprint.load", {
    nodes: await nodeCount(page),
    edges: await page.locator(".react-flow__edge").count(),
    ...(await overlapReport(page)),
  });

  // Selecting a node → inspector (desktop column)
  await page.locator(".react-flow__node").first().click({ force: true });
  await page.waitForTimeout(600);
  const inspectorAside = page.locator('aside[aria-label="Node inspector"]');
  log("inspector.open", { count: await inspectorAside.count() });

  if ((await inspectorAside.count()) > 0) {
    const replicas = inspectorAside.locator('input[type="number"]').nth(2);
    await replicas.fill("3");
    await page.waitForTimeout(500);
    log("inspector.replicas", { value: await replicas.inputValue() });
    const regionSelect = inspectorAside.locator("select").first();
    await regionSelect.selectOption("eu-central-1");
    await page.waitForTimeout(400);
    log("inspector.region", { chip: await page.locator(".react-flow__node").first().innerText() });
    const entryTraffic = inspectorAside.locator('input[type="number"]').nth(5);
    await entryTraffic.fill("3000");
    await page.waitForTimeout(1600);
    log("sim.liveOverride", { text: await page.locator(".react-flow__node").first().innerText() });
  }

  // Click an edge → ConnectionInspector
  const edge = page.locator(".react-flow__edge-interaction").first();
  if (await edge.count()) {
    const box = await edge.boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
  }
  const connectionInspector = page.locator('[aria-label="Connection inspector"]');
  log("edge.inspector", { count: await connectionInspector.count() });
  if ((await connectionInspector.count()) > 0) {
    await page.locator('[aria-label="Connection inspector"] input').first().fill("orders gRPC");
    await page.waitForTimeout(300);
    const labelRendered = await page.locator(".react-flow__edge-text").first().textContent().catch(() => null);
    log("edge.labelEdit", { labelRendered });
    await page.locator('[aria-label="Connection inspector"] button[title="Close"]').click();
    await page.waitForTimeout(300);
    // Re-select a different edge: the dismissed panel must come back.
    const secondEdge = page.locator(".react-flow__edge-interaction").nth(1);
    if (await secondEdge.count()) {
      const box = await secondEdge.boundingBox();
      if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(400);
    }
    log("edge.inspectorReopen", { count: await connectionInspector.count() });
  }

  // Auto-layout
  await page.locator('button[title^="Auto-layout everything"]').click();
  await page.waitForTimeout(700);
  log("toolbar.autoLayout", { nodes: await nodeCount(page), ...(await overlapReport(page)) });

  // Undo / redo of an add
  const before = await nodeCount(page);
  await page.getByRole("button", { name: /^Blueprints$/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /^Resources$/ }).click();
  await page.waitForTimeout(300);
  const edgeRes = page.getByRole("button", { name: /CDN Edge \(CloudFront/ }).first();
  if (await edgeRes.count()) await edgeRes.click();
  await page.waitForTimeout(500);
  const afterAdd = await nodeCount(page);
  await page.locator('button[title^="Undo last canvas change"]').click();
  await page.waitForTimeout(500);
  const afterUndo = await nodeCount(page);
  await page.locator('button[title^="Redo"]').click();
  await page.waitForTimeout(500);
  const afterRedo = await nodeCount(page);
  log("toolbar.undoRedo", { before, afterAdd, afterUndo, afterRedo });

  // Clear canvas (two-step)
  await page.locator('button[title^="Clear the whole canvas"]').click();
  await page.waitForTimeout(250);
  await page.locator('button[title^="Clear the whole canvas"]').click();
  await page.waitForTimeout(700);
  log("toolbar.clear", { nodes: await nodeCount(page), onboarding: await page.getByText("Start a system in seconds").count() });

  log("desktop.errors", { errors });
  await context.close();
}

// ── B. Deep link ?add= ─────────────────────────────────────────────────────
{
  const { context, page, errors } = await open("/canvas?add=redis_cache,postgres_db", { width: 1440, height: 900 });
  await page.waitForTimeout(1400);
  log("deeplink.add", {
    count: await nodeCount(page),
    labels: await page.locator(".react-flow__node").allInnerTexts(),
    url: page.url(),
    ...(await overlapReport(page)),
  });
  await page.screenshot({ path: `${OUT}/deeplink.png` });
  log("deeplink.errors", { errors });
  await context.close();
}

// ── C. Mobile + tablet ergonomics ──────────────────────────────────────────
for (const [label, viewport] of [
  ["mobile", { width: 375, height: 812 }],
  ["tablet", { width: 768, height: 1024 }],
]) {
  const { context, page, errors } = await open("/canvas", viewport);
  const metrics = await page.evaluate(() => {
    const rail = document.querySelector('aside[aria-label="Workspace palette"]');
    const canvas = document.querySelector(".react-flow");
    const dock = document.querySelector(".react-flow")?.parentElement?.querySelector(".z-30");
    const dockInner = dock?.firstElementChild;
    return {
      viewport: window.innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      railWidth: rail?.getBoundingClientRect().width ?? null,
      canvasWidth: canvas?.getBoundingClientRect().width ?? null,
      dockRect: dockInner ? dockInner.getBoundingClientRect().toJSON() : null,
      dockScrollWidth: dockInner?.scrollWidth ?? null,
      dockClientWidth: dockInner?.clientWidth ?? null,
      dockHeight: dockInner?.getBoundingClientRect().height ?? null,
    };
  });
  log(`${label}.layout`, metrics);
  await page.screenshot({ path: `${OUT}/${label}-initial.png` });

  // Open the palette drawer from the header
  await page.locator('header button[title*="palette"]').first().click();
  await page.waitForTimeout(600);
  const railOpen = await page.evaluate(() => ({
    railWidth: document.querySelector('aside[aria-label="Workspace palette"]')?.getBoundingClientRect().width ?? null,
    canvasWidth: document.querySelector(".react-flow")?.getBoundingClientRect().width ?? null,
    backdrop: Boolean(document.querySelector('[aria-label="Close workspace palette"]')),
    docScrollWidth: document.documentElement.scrollWidth,
  }));
  log(`${label}.railOpen`, railOpen);
  await page.screenshot({ path: `${OUT}/${label}-rail-open.png` });

  // Tap a primitive → drawer closes and the node is centered
  const resourceRow = page.getByRole("button", { name: /Stateless REST Service/ }).first();
  if (await resourceRow.count()) {
    await resourceRow.click();
    await page.waitForTimeout(900);
  }
  const afterAdd = await page.evaluate(() => ({
    railWidth: document.querySelector('aside[aria-label="Workspace palette"]')?.getBoundingClientRect().width ?? null,
    canvasWidth: document.querySelector(".react-flow")?.getBoundingClientRect().width ?? null,
    nodes: document.querySelectorAll(".react-flow__node").length,
  }));
  log(`${label}.addFromDrawer`, afterAdd);

  // Node inspector drawer
  const inspectorToggle = page.locator('header button[title="Toggle node inspector"]');
  if (await inspectorToggle.count()) {
    await inspectorToggle.click();
    await page.waitForTimeout(600);
    const inspector = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Node inspector"]');
      return {
        open: Boolean(aside),
        width: aside?.getBoundingClientRect().width ?? null,
        canvasWidth: document.querySelector(".react-flow")?.getBoundingClientRect().width ?? null,
        docScrollWidth: document.documentElement.scrollWidth,
      };
    });
    log(`${label}.inspectorDrawer`, inspector);
    await page.screenshot({ path: `${OUT}/${label}-inspector.png` });
  }

  log(`${label}.errors`, { errors });
  await context.close();
}

await browser.close();
console.log(`\n\n===== FULL REPORT =====\n${JSON.stringify(report, null, 2)}`);
