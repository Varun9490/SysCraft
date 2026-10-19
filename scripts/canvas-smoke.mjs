/**
 * Canvas smoke harness for:
 *   A) handle-to-handle connection drag (must create a NEW edge)
 *   B) node badge clipping / handle reachability (hit-test via elementFromPoint)
 *   C) per-link appearance (colour persists onto the rendered edge path)
 *   D) block comments (inspector textarea → pinned chip on the node)
 *
 * This is the Phase-1 feedback loop from the connection-bug diagnosis; it
 * doubles as the post-deploy verification harness (same script runs against
 * production). Exits 1 when any probe fails. Usage:
 *   node scripts/canvas-smoke.mjs [baseURL]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3210";

async function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`dev server at ${url} not ready in ${timeoutMs}ms`);
}

function center(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

await waitForServer(BASE);
console.log(`[loop] server ready: ${BASE}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

await page.goto(`${BASE}/canvas`, { waitUntil: "load", timeout: 60_000 });

try {
  // Fresh canvas boots empty behind an onboarding overlay — load the starter
  // architecture so there are nodes to bind.
  await page.waitForSelector(".react-flow", { state: "attached", timeout: 120_000 });
  const starter = page.getByText("Load the starter architecture", { exact: false }).first();
  if (await starter.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await starter.click();
  }
  await page.waitForSelector(".react-flow__node", { state: "attached", timeout: 30_000 });
  await page.waitForSelector(".react-flow__node", { state: "visible", timeout: 15_000 });
} catch (err) {
  console.error("[loop] RED: react-flow nodes never arrived", String(err).slice(0, 200));
  console.error("[diag] console errors so far:", JSON.stringify(consoleErrors, null, 2));
  await page.screenshot({ path: "scripts/canvas-smoke-never-loaded.png", fullPage: false });
  await browser.close();
  process.exit(1);
}
// Give hydration a beat (sim worker boot, prefs hydrate).
await page.waitForTimeout(1500);

const failures = [];

// --- Probe B1: badge clipping ------------------------------------------
const clipped = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll(".react-flow__node .syscraft-node-enter > div").forEach((box, i) => {
    const cs = getComputedStyle(box);
    if (cs.overflowX === "hidden" && box.scrollWidth > box.clientWidth + 1) {
      out.push({ node: i, scrollWidth: box.scrollWidth, clientWidth: box.clientWidth });
    }
  });
  return out;
});
if (clipped.length > 0) failures.push({ probe: "B1 invite clipping", clipped });

// --- Probe B2: every handle reachable by hit-test -----------------------
const handleMisses = await page.evaluate(() => {
  const misses = [];
  document.querySelectorAll(".react-flow__node").forEach((node, i) => {
    node.querySelectorAll(".react-flow__handle").forEach((h, j) => {
      const hb = h.getBoundingClientRect();
      if (hb.width < 8 || hb.height < 8) {
        misses.push({ node: i, handle: j, reason: "below minimum grab size" });
        return;
      }
      const top = document.elementFromPoint(hb.left + hb.width / 2, hb.top + hb.height / 2);
      if (!(top && (top === h || h.contains(top)))) {
        misses.push({ node: i, handle: j, reason: `covered by ${top ? top.className : "nothing"}` });
      }
    });
  });
  return misses;
});
if (handleMisses.length > 0) failures.push({ probe: "B2 handle hit-test", handleMisses });

// --- Probe A: create a NEW connection n0 -> n2 (fallback n3) ------------
const edgesBefore = await page.locator(".react-flow__edge").count();
console.log(`[loop] nodes=${await page.locator(".react-flow__node").count()} edges=${edgesBefore}`);

let connected = false;
let connectedTo = -1;
for (const targetIdx of [2, 3]) {
  const nodeCount = await page.locator(".react-flow__node").count();
  if (targetIdx >= nodeCount) continue;
  const shBox = await page.locator(".react-flow__node").nth(0).locator(".react-flow__handle.source").boundingBox();
  const thBox = await page.locator(".react-flow__node").nth(targetIdx).locator(".react-flow__handle.target").boundingBox();
  if (!shBox || !thBox) continue;
  const sc = center(shBox);
  const tc = center(thBox);
  await page.mouse.move(sc.x, sc.y, { steps: 3 });
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.mouse.move((sc.x + tc.x) / 2, (sc.y + tc.y) / 2, { steps: 8 });
  await page.mouse.move(tc.x, tc.y, { steps: 12 });
  await page.waitForTimeout(180);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const now = await page.locator(".react-flow__edge").count();
  if (now > edgesBefore) {
    connected = true;
    connectedTo = targetIdx;
    console.log(`[loop] connection created: n0 -> n${targetIdx} (edges ${edgesBefore} -> ${now})`);
    break;
  }
  console.log(`[loop] drag n0 -> n${targetIdx} produced no edge`);
}
if (!connected) failures.push({ probe: "A connection drag" });

// --- Probe C: per-link colour via connection inspector ------------------
if (connected) {
  const edgeCount = await page.locator(".react-flow__edge").count();
  const newEdgePath = page.locator(".react-flow__edge-path").nth(edgeCount - 1);

  // Click the exact midpoint of the rendered path so the pointer lands on
  // the SVG stroke no matter how the route bends.
  let inspectorUp = false;
  try {
    // The thick invisible interaction path is xyflow's robust hit target —
    // clicking its bbox midpoint selects the edge even where the visible
    // stroke crosses under a node block.
    const ib = await page.locator(".react-flow__edge-interaction").nth(edgeCount - 1).boundingBox();
    if (!ib) throw new Error("no interaction path");
    await page.mouse.click(ib.x + ib.width / 2, ib.y + ib.height / 2);
    await page.waitForTimeout(350);
    const selectedCount = await page.locator(".react-flow__edge.selected").count();
    const asideAttached = await page.locator('[aria-label="Connection inspector"]').count();
    inspectorUp = selectedCount > 0 && asideAttached > 0;
  } catch {
    inspectorUp = false;
  }
  if (!inspectorUp) {
    const selectedCount = await page.locator(".react-flow__edge.selected").count();
    const asideAttached = await page.locator('[aria-label="Connection inspector"]').count();
    await page.screenshot({ path: "scripts/canvas-smoke-edge-click.png", fullPage: false });
    failures.push({ probe: "C connection inspector open", selectedCount, asideAttached });
  } else {
    const swatch = page.locator('button[aria-label="Link colour #34d399"]');
    await swatch.first().click();
    await page.waitForTimeout(400);
    const stroke = await newEdgePath.evaluate((el) => getComputedStyle(el).stroke);
    const strokeOk = /^rgb\(52, 211, 153\)$/.test(stroke);
    if (!strokeOk) {
      failures.push({ probe: "C link colour", stroke });
    }
    console.log(`[loop] edge stroke after swatch: ${stroke} (ok=${strokeOk})`);
    // Deselect the edge (pane click) so the inspector closes.
    await page.mouse.click(120, 700);
    await page.waitForTimeout(300);
  }
}

// --- Probe D: block comment via node inspector ---------------------------
await page.locator(".react-flow__node").nth(0).click();
const noteArea = page.locator('textarea[aria-label="Block comment"]');
const textareaUp = await noteArea.waitFor({ state: "visible", timeout: 6_000 }).then(() => true).catch(() => false);
if (!textareaUp) {
  failures.push({ probe: "D node inspector open" });
} else {
  await noteArea.fill("Serves only static assets; move to edge if TLS offload is needed.");
  await page.waitForTimeout(400);
  const chip = page.locator('span[aria-label="Block comment chip"]').first();
  const chipUp = await chip.waitFor({ state: "visible", timeout: 4_000 }).then(() => true).catch(() => false);
  if (!chipUp) failures.push({ probe: "D comment chip render" });
  console.log(`[loop] comment chip rendered: ${chipUp}`);
}

// --- Probe E/F: auto-save + restore on refresh ---------------------------
// The topology is persisted (debounced 500ms) in localStorage under
// syscraft-canvas-v1 and rehydrated before first paint on the shell.
await page.waitForTimeout(900); // clear the debounce window
const saved = await page
  .evaluate(() => {
    try {
      return Boolean(window.localStorage.getItem("syscraft-canvas-v1"));
    } catch {
      return false;
    }
  })
  .catch(() => false);
if (!saved) failures.push({ probe: "E auto-save snapshot in localStorage" });
console.log(`[loop] auto-save snapshot present: ${saved}`);

let restored = 0;
if (saved) {
  try {
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector(".react-flow__node", { state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1200);
    restored = await page.locator(".react-flow__node").count();
  } catch {
    restored = 0;
  }
  if (restored < 4) failures.push({ probe: "F refresh restores canvas", restored });
  console.log(`[loop] nodes after reload: ${restored}`);
}

// --- Probe G: pre-run check pill ----------------------------------------
// Break the restored topology (delete the middle service node; its database
// becomes unreachable) → the dock must show the amber "Run check" pill, and
// clicking it must open the Design Doctor panel.
if (restored >= 4) {
  const pillProbe = { pill: 0, doctor: 0, nodesAfter: 0 };
  try {
    // Node ids are random-suffixed (n_mvfc0zjx_*), so target the middle
    // service node by its persisted label instead of a literal id.
    const apiNode = page.locator(".react-flow__node", { hasText: "Checkout API" }).first();
    await apiNode.click({ force: true, timeout: 8_000 });
    await page.waitForTimeout(250);
    const selected = await page.locator(".react-flow__node.selected").count();
    console.log(`[diag] selected nodes after click Checkout API: ${selected}`);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(900);
    pillProbe.nodesAfter = await page.locator(".react-flow__node").count();
    pillProbe.pill = await page.locator('button[aria-label^="Run check"]').count();
  } catch (err) {
    console.log(`[diag] probe G exception: ${String(err).slice(0, 160)}`);
  }
  await page.screenshot({ path: "scripts/canvas-smoke-runcheck.png", fullPage: false });
  console.log(`[diag] nodes after delete: ${pillProbe.nodesAfter}`);
  if (pillProbe.pill === 0) {
    failures.push({ probe: "G pre-run pill visible after break", ...pillProbe });
  } else {
    await page.locator('button[aria-label^="Run check"]').first().click();
    await page.waitForTimeout(700);
    pillProbe.doctor = await page.locator('[aria-label="Design Doctor report"]').count();
    if (pillProbe.doctor === 0) failures.push({ probe: "G doctor opens from pill", ...pillProbe });
  }
  console.log(`[loop] run-check pill: ${JSON.stringify(pillProbe)}`);
}

// --- Probe H: wiki → canvas handoff -------------------------------------
// The primitives library advertises adding a block to the canvas. The link
// must carry the primitive (?add=postgres_db) and the canvas must actually
// drop it — a plain navigation to /canvas is the bug this locks down.
const handoff = { href: null, nodes: 0, postgres: 0 };
try {
  await page.goto(`${BASE}/wiki/primitives?resource=postgres_db`, { waitUntil: "load" });
  // The article CTA (not the per-item rail links) is the one under test.
  const addLink = page.locator('article a[href^="/canvas?add="]').first();
  await addLink.waitFor({ state: "visible", timeout: 30_000 });
  // The ?resource= id is applied after mount — wait for the CTA to carry it.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    handoff.href = await addLink.getAttribute("href");
    if (handoff.href && handoff.href.includes("add=postgres_db")) break;
    await page.waitForTimeout(250);
  }
  await addLink.click();
  await page.waitForSelector(".react-flow__node", { state: "visible", timeout: 60_000 });
  await page.waitForTimeout(1200);
  handoff.nodes = await page.locator(".react-flow__node").count();
  handoff.postgres = await page.locator(".react-flow__node", { hasText: /postgres/i }).count();
} catch (err) {
  console.log(`[diag] probe H exception: ${String(err).slice(0, 160)}`);
}
if (!handoff.href || !handoff.href.includes("add=postgres_db")) {
  failures.push({ probe: "H wiki add link carries primitive", href: handoff.href });
}
if (handoff.postgres < 1) {
  failures.push({ probe: "H primitive dropped on canvas", ...handoff });
}
console.log(`[loop] wiki handoff: ${JSON.stringify(handoff)}`);

await page.screenshot({ path: "scripts/canvas-smoke-last.png", fullPage: false });

console.log(JSON.stringify({ verdict: { failures } }, null, 2));
const red =
  failures.length > 0 || consoleErrors.length > 0;
if (consoleErrors.length > 0) console.error("[diag] console errors:", consoleErrors.slice(0, 8));
console.log(red ? "[loop] RED — bug reproduced" : "[loop] GREEN — all probes pass");
await browser.close();
process.exit(red ? 1 : 0);
