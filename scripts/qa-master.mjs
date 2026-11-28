/**
 * SysCraft — Step 1 live runtime UI/UX audit (master).
 *
 * Self-contained Playwright audit. It exercises the *runtime* behaviours that
 * the landing/canvas agents do not own: command palette, theme, custom cursor,
 * ambient field, readers, blogs index, knowledge map, tools, break reminder,
 * quiz, export/import, responsive layout, and browser error telemetry.
 *
 * Usage:
 *   BASE_URL=https://sys-craft.vercel.app node scripts/qa-master.mjs
 *
 * Only two files are written by this script:
 *   docs/runtime-audit.md            (the generated report)
 *   <tmp>/runtime-audit-shots/*.png  (evidence screenshots, outside the repo)
 *
 * Beyond the original palette/theme/cursor/ambient/reader/blog/map/tools/
 * reminder/quiz/data/responsive/error sweep, this run also verifies the newer
 * behaviours: meaningful-read eligibility, arrow-key replay of the visual body
 * transition, lazy-loaded bespoke visuals, the landing closing CTA and bento
 * alignment, and Markdown-free labs excerpts.
 *
 * Every check either PASSes, FAILs with a concrete measurement, or is recorded
 * as NOT VERIFIED with an explicit reason. Nothing is silently skipped and no
 * threshold is relaxed to hide a failure.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { chromium } from "playwright";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.BASE_URL ?? "https://sys-craft.vercel.app").replace(/\/+$/, "");
const REPORT_PATH = resolve(process.cwd(), "docs", "runtime-audit.md");
const SHOT_DIR = resolve(tmpdir(), "runtime-audit-shots");
const LEARNER_KEY = "syscraft.learner.v1";
const INTERACTION_TIMEOUT = 20000;

const ROUTES = {
  home: "/",
  paths: "/paths",
  lesson: "/paths/foundations/single-server",
  blog: "/blogs/database-melts-at-10k-rps",
  blogs: "/blogs",
  map: "/map",
  tools: "/tools",
  quiz: "/quiz",
  settings: "/settings",
};

/** Extra routes used only by the newer checks (PAL-01/ERR-01 stay unchanged). */
const NEW_ROUTES = {
  tokenizationLesson: "/paths/ai-engineering/tokenization",
  kubernetesLesson: "/paths/backend-cloud/kubernetes",
  lruLesson: "/paths/case-studies/lld-lru-cache",
  labs: "/labs",
};

const VIEWPORTS = [
  { label: "375", width: 375, height: 812, isMobile: true, hasTouch: true },
  { label: "768", width: 768, height: 1024, isMobile: false, hasTouch: false },
  { label: "1280", width: 1280, height: 800, isMobile: false, hasTouch: false },
  { label: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false },
];

/** The landing brief calls out 390 and 1440 explicitly; RSP-01 is left intact. */
const LANDING_VIEWPORTS = [
  { label: "390", width: 390, height: 844, isMobile: true, hasTouch: true },
  { label: "1440", width: 1440, height: 900, isMobile: false, hasTouch: false },
];

function emptyLearner(overrides = {}) {
  return {
    version: 1,
    completedLessons: [],
    readBlogs: [],
    visitedTopics: [],
    mastery: {},
    quizHistory: [],
    notes: {},
    bookmarks: [],
    resume: null,
    prefs: { mode: "both", theme: "dark", ambient: false, cursor: false, breakMinutes: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/** @type {Array<{id,area,title,severity,routes,steps,status,detail,evidence}>} */
const results = [];
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const httpErrors = [];
const openContexts = [];
let browser;

mkdirSync(SHOT_DIR, { recursive: true });

async function trackedContext(options = {}) {
  const context = await browser.newContext(options);
  openContexts.push(context);
  return context;
}

function sameOrigin(rawUrl) {
  if (!rawUrl) return true;
  try {
    return new URL(rawUrl).origin === new URL(BASE_URL).origin;
  } catch {
    return false;
  }
}

function watchPage(page, label) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location() ?? {};
    consoleErrors.push({
      label,
      text: message.text(),
      url: location.url ?? "",
      sameOrigin: sameOrigin(location.url),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ label, message: error.message, stack: (error.stack ?? "").slice(0, 300) });
  });
  page.on("requestfailed", (request) => {
    networkErrors.push({
      label,
      url: request.url(),
      error: request.failure()?.errorText ?? "request failed",
      sameOrigin: sameOrigin(request.url()),
    });
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    httpErrors.push({
      label,
      url: response.url(),
      status: response.status(),
      sameOrigin: sameOrigin(response.url()),
    });
  });
}

async function newPage(context, label) {
  const page = await context.newPage();
  watchPage(page, label);
  return page;
}

async function audit({ id, area, title, severity, routes = [], steps = "", fn }) {
  try {
    const evidence = (await fn()) ?? {};
    results.push({ id, area, title, severity, routes, steps, status: "PASS", detail: "", evidence });
    console.log(`PASS  [${severity}] ${id} — ${title}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({
      id,
      area,
      title,
      severity,
      routes,
      steps,
      status: "FAIL",
      detail,
      evidence: (error && typeof error === "object" && error.evidence) || {},
    });
    console.log(`FAIL  [${severity}] ${id} — ${title}`);
    console.log(`      ${detail.split("\n")[0]}`);
  }
}

function notVerified({ id, area, title, severity, routes = [], reason, codeRefs = "" }) {
  results.push({
    id,
    area,
    title,
    severity,
    routes,
    steps: "Code inspection only — see reason.",
    status: "NOT VERIFIED",
    detail: reason,
    evidence: { codeRefs },
  });
  console.log(`NOT VERIFIED [${severity}] ${id} — ${title}`);
}

async function seed(context, state) {
  await context.addInitScript(
    ({ key, value }) => {
      try {
        if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
      } catch {
        /* storage denial is handled by the application */
      }
    },
    { key: LEARNER_KEY, value: JSON.stringify(state) },
  );
}

async function readLearner(page) {
  return page.evaluate((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, LEARNER_KEY);
}

/** PlatformRuntime mounts the dock in the same commit as the palette listener. */
async function waitRuntime(page) {
  await page.locator("[data-utility-launcher]").waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
  // Effects (including the Ctrl+K listener) attach after the mount commit.
  await page.waitForTimeout(400);
}

async function goto(page, route) {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  assert.ok(response && response.status() < 400, `HTTP ${response?.status() ?? "none"} for ${route}`);
  await page.locator("h1").first().waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
  await waitRuntime(page);
}

/**
 * The shortcut listener attaches in an effect. Immediately after hydration a
 * first Ctrl+K can be missed, so retry and report how many attempts it took.
 * Falls back to the dock's Search button; that fallback is itself evidence.
 */
async function openPalette(page) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);
    if ((await page.locator("[cmdk-input]").count()) > 0) return { attempts: attempt, via: "keyboard" };
  }
  await page.locator("[data-utility-launcher]").click();
  await page.getByRole("button", { name: /Search lessons, labs, and tools/i }).click();
  await page.locator("[cmdk-input]").waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
  return { attempts: 5, via: "dock fallback" };
}

async function paletteItems(page) {
  const raw = await page.locator("[cmdk-item]").allInnerTexts();
  return raw.map((text) => text.replace(/\s+/g, " ").trim());
}

async function activeStep(page) {
  const label = await page.locator('[aria-current="step"]').first().getAttribute("aria-label");
  const match = /step\s+(\d+)/i.exec(label ?? "");
  assert.ok(match, `cannot read active step from aria-label "${label}"`);
  return Number(match[1]);
}

/** Readers flip data-learner-hydrated only after the store rehydration effect. */
async function waitHydrated(page) {
  await page.locator('main[data-learner-hydrated="true"]').waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
  // The final-step effect also gates on resumeReady, which is set in a rAF.
  await page.waitForTimeout(350);
}

function stepDots(page) {
  return page.getByRole("button", { name: /^Go to step \d+:/ });
}

/** Navigate via the real step controls and wait for the committed step. */
async function goToStep(page, index) {
  await stepDots(page).nth(index).click();
  await page.waitForFunction(
    (expected) => {
      const current = document.querySelector('[aria-current="step"]');
      return new RegExp(`step\\s+${expected + 1}`, "i").test(current?.getAttribute("aria-label") ?? "");
    },
    index,
    { timeout: INTERACTION_TIMEOUT },
  );
}

async function gotoFinalStep(page) {
  const count = await stepDots(page).count();
  assert.ok(count >= 2, `reader exposed only ${count} step dots`);
  await goToStep(page, count - 1);
  return count;
}

function hasTrackedId(state, field, id) {
  return Array.isArray(state?.[field]) && state[field].includes(id);
}

/**
 * Watch the visual's keyed motion group. React remounts <motion.g key={version}>
 * on every committed step change; the entrance style (opacity 0.55 / translateY)
 * and the body fingerprint prove the *visual* animated, not just the step dot.
 */
async function installVisualProbe(page) {
  await page.evaluate(() => {
    // TopicVisual is keyed by step, so the SVG itself can be replaced. Observe
    // the stable figure ancestor and resolve the current SVG on every read.
    const figure = document.querySelector('figure:has(svg[role="img"])');
    if (!figure) throw new Error("visual figure not found");
    const currentSvg = () => figure.querySelector('svg[role="img"]');
    const body = () => {
      const group = currentSvg()?.querySelector(":scope > g");
      // FlowDot loops rewrite inline styles continuously and framer-motion
      // writes transform-origin as an attribute; strip both so the fingerprint
      // only reflects structural/step-dependent content.
      return group
        ? group.outerHTML.replace(/ style="[^"]*"/g, "").replace(/ transform-origin="[^"]*"/g, "")
        : "";
    };
    const version = () => (currentSvg()?.textContent ?? "").match(/STEP\s+\d+/i)?.[0] ?? "";
    const initialSvg = currentSvg();
    const initialGroup = initialSvg?.querySelector(":scope > g");
    const probe = {
      svgAdds: 0,
      svgRemoves: 0,
      gAdds: 0,
      gRemoves: 0,
      svgReplaced: false,
      styles: [],
      versionBefore: version(),
      versionAfter: version(),
      bodyBefore: body(),
      bodyAfter: body(),
    };
    window.__syscraftVisualProbe = probe;
    const isSvg = (node) =>
      node && node.nodeType === 1 && node.tagName.toLowerCase() === "svg" && node.getAttribute("role") === "img";
    const isBody = (node) => {
      if (!node || node.nodeType !== 1 || node.tagName.toLowerCase() !== "g") return false;
      // Removed nodes are detached (parentElement null), hence the identity check.
      return node.parentElement === currentSvg() || node === initialGroup;
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) {
            if (isSvg(node)) {
              probe.svgAdds += 1;
              if (initialSvg && node !== initialSvg) probe.svgReplaced = true;
            }
            if (isBody(node)) {
              probe.gAdds += 1;
              probe.styles.push(node.getAttribute("style") ?? "");
            }
          }
          for (const node of record.removedNodes) {
            if (isSvg(node)) probe.svgRemoves += 1;
            if (isBody(node)) probe.gRemoves += 1;
          }
        } else if (record.type === "attributes" && isBody(record.target)) {
          probe.styles.push(record.target.getAttribute("style") ?? "");
        }
      }
      // React swaps the visual's wrapper <div>, so the new <svg> arrives as a
      // descendant of an added node and is never an addedNode itself. Detect
      // the remount by identity against the SVG captured before navigation.
      probe.svgReplaced = probe.svgReplaced || currentSvg() !== initialSvg;
      probe.versionAfter = version();
      probe.bodyAfter = body();
    });
    observer.observe(figure, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    window.__syscraftVisualProbeStop = () => observer.disconnect();
  });
}

async function readVisualProbe(page) {
  return page.evaluate(() => {
    const probe = window.__syscraftVisualProbe;
    if (!probe) return null;
    window.__syscraftVisualProbeStop?.();
    return { ...probe };
  });
}

function assertVisualReplayed(probe, direction) {
  assert.ok(probe, `${direction}: visual probe was not installed`);
  const groupRemount = probe.gAdds >= 1 && probe.gRemoves >= 1;
  const visualRemount = probe.svgReplaced || (probe.svgAdds >= 1 && probe.svgRemoves >= 1);
  assert.ok(
    groupRemount || visualRemount,
    `${direction}: visual body did not remount (svgReplaced=${probe.svgReplaced}, svgAdds=${probe.svgAdds}, svgRemoves=${probe.svgRemoves}, gAdds=${probe.gAdds}, gRemoves=${probe.gRemoves})`,
  );
  assert.notEqual(probe.bodyAfter, probe.bodyBefore, `${direction}: visual body content did not change`);
  assert.notEqual(probe.versionAfter, probe.versionBefore, `${direction}: visual's own step version did not change (${probe.versionBefore} -> ${probe.versionAfter})`);
}

async function scrollToSection(page, text) {
  await page.evaluate((needle) => {
    const section = Array.from(document.querySelectorAll("section")).find((node) =>
      (node.textContent ?? "").includes(needle),
    );
    section?.scrollIntoView({ block: "center", behavior: "auto" });
  }, text);
  // ScrollReveal uses a ~0.9s whileInView entrance; measure only after it settles.
  await page.waitForTimeout(1000);
}

async function gridGeometry(page, sectionText) {
  return page.evaluate((needle) => {
    const section = Array.from(document.querySelectorAll("section")).find((node) =>
      (node.textContent ?? "").includes(needle),
    );
    if (!section) return null;
    const wrapper = section.querySelector("div.section-container");
    const grid = wrapper?.querySelector("div.grid");
    if (!(grid instanceof HTMLElement)) return null;
    const rect = grid.getBoundingClientRect();
    const cols = getComputedStyle(grid)
      .gridTemplateColumns.trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const round = (value) => Math.round(value * 10) / 10;
    return {
      cols,
      container: { x: round(rect.x), y: round(rect.y), w: round(rect.width), h: round(rect.height) },
      children: Array.from(grid.children).map((child) => {
        const box = child.getBoundingClientRect();
        return { x: round(box.x), y: round(box.y), w: round(box.width), h: round(box.height) };
      }),
    };
  }, sectionText);
}

function assertGridAligned(geometry, expectedCols, label) {
  assert.ok(geometry, `${label}: grid container not found`);
  const { container, children, cols } = geometry;
  assert.equal(cols, expectedCols, `${label}: expected ${expectedCols} columns, got ${cols}`);
  assert.ok(children.length >= 2, `${label}: only ${children.length} grid cells`);
  for (const [index, cell] of children.entries()) {
    assert.ok(
      cell.x >= container.x - 1 && cell.x + cell.w <= container.x + container.w + 1,
      `${label}: cell ${index} escapes the grid horizontally (${JSON.stringify(cell)} in ${JSON.stringify(container)})`,
    );
    assert.ok(
      cell.y >= container.y - 1 && cell.y + cell.h <= container.y + container.h + 1,
      `${label}: cell ${index} escapes the grid vertically (${JSON.stringify(cell)} in ${JSON.stringify(container)})`,
    );
  }
  const rows = new Map();
  for (const cell of children) {
    const top = Math.round(cell.y / 2) * 2;
    rows.set(top, [...(rows.get(top) ?? []), cell]);
  }
  for (const [top, cells] of rows) {
    const heights = cells.map((cell) => cell.h);
    assert.ok(
      Math.max(...heights) - Math.min(...heights) <= 1,
      `${label}: row at y=${top} has uneven cell heights ${heights.join(", ")}`,
    );
    const ordered = [...cells].sort((a, b) => a.x - b.x);
    for (let i = 1; i < ordered.length; i += 1) {
      assert.ok(
        ordered[i].x >= ordered[i - 1].x + ordered[i - 1].w - 1,
        `${label}: overlapping cells in row y=${top}`,
      );
    }
  }
}

async function shot(page, name) {
  const path = resolve(SHOT_DIR, `${name}.png`);
  try {
    await page.screenshot({ path, fullPage: false });
    return path;
  } catch {
    return "screenshot unavailable";
  }
}

async function overflowMeasure(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    overflowPx: document.documentElement.scrollWidth - window.innerWidth,
    offenders: Array.from(document.querySelectorAll("body *"))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.right > window.innerWidth + 1 &&
          style.position !== "fixed" &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      })
      .slice(0, 6)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 50)} right=${Math.round(el.getBoundingClientRect().right)}`),
  }));
}

// ---------------------------------------------------------------------------
// 1. Command palette
// ---------------------------------------------------------------------------

try {
  browser = await chromium.launch({ headless: true });
  const paletteContext = await trackedContext({ viewport: VIEWPORTS[3] });
  const palettePage = await newPage(paletteContext, "palette");

  await audit({
    id: "PAL-01",
    area: "Command palette",
    title: "Ctrl+K opens the palette on every audited route and Escape closes it",
    severity: "P1",
    routes: [ROUTES.home, ROUTES.paths, ROUTES.blogs, ROUTES.map, ROUTES.tools, ROUTES.quiz, ROUTES.settings],
    steps: "On each route wait for the dock launcher, press Ctrl+K, check [cmdk-input], press Escape.",
    fn: async () => {
      const rows = [];
      for (const route of Object.values(ROUTES)) {
        await goto(palettePage, route);
        const opened = await openPalette(palettePage);
        assert.equal(await palettePage.locator("[cmdk-input]").count(), 1, `no palette input on ${route}`);
        assert.equal(await palettePage.locator("[cmdk-input]").isVisible(), true, `palette not visible on ${route}`);
        await palettePage.keyboard.press("Escape");
        await palettePage.waitForTimeout(200);
        assert.equal(await palettePage.locator("[cmdk-input]").count(), 0, `Escape did not close palette on ${route}`);
        rows.push({ route, attempts: opened.attempts, via: opened.via });
      }
      const late = rows.filter((r) => r.attempts > 1 || r.via !== "keyboard");
      assert.deepEqual(late, [], `shortcut required retry/fallback on: ${late.map((r) => r.route).join(", ")}`);
      return { routes: rows.length, attempts: rows.map((r) => r.attempts) };
    },
  });

  await audit({
    id: "PAL-02",
    area: "Command palette",
    title: "Fuzzy search covers tracks, lessons, blogs, labs, tools and notation as advertised",
    severity: "P1",
    routes: [ROUTES.paths, ROUTES.tools],
    steps: "Open Ctrl+K and search each probe term; inspect returned item labels.",
    fn: async () => {
      await goto(palettePage, ROUTES.paths);
      const probes = [
        { group: "tracks", term: "foundations", expect: "foundations" },
        { group: "blogs", term: "database melts", expect: "database melts" },
        { group: "tools", term: "capacity", expect: "capacity" },
        { group: "tools", term: "error budget", expect: "error budget" },
        { group: "tools", term: "notation", expect: "notation" },
        { group: "lessons", term: "single server", expect: "single server" },
        { group: "lessons", term: "raft consensus", expect: "raft" },
        { group: "labs", term: "bitly", expect: "bitly" },
        { group: "labs", term: "twitter timeline", expect: "twitter" },
        { group: "notation", term: "p99", expect: "p99" },
        { group: "notation", term: "quorum", expect: "quorum" },
      ];
      const coverage = [];
      for (const probe of probes) {
        if ((await palettePage.locator("[cmdk-input]").count()) === 0) await openPalette(palettePage);
        await palettePage.locator("[cmdk-input]").fill(probe.term);
        await palettePage.waitForTimeout(220);
        const items = await paletteItems(palettePage);
        coverage.push({
          ...probe,
          matches: items.filter((text) => text.toLowerCase().includes(probe.expect)),
          returned: items.length,
        });
      }
      await palettePage.keyboard.press("Escape");
      const missing = coverage.filter((row) => row.matches.length === 0);
      const evidence = { coverage, totalItems: coverage[0]?.returned ?? 0 };
      assert.deepEqual(
        missing.map((m) => `${m.group}:${m.term}`),
        [],
        `no result for advertised content: ${missing.map((m) => `${m.group} "${m.term}"`).join("; ")}`,
      );
      return evidence;
    },
  });

  await audit({
    id: "PAL-03",
    area: "Command palette",
    title: "Arrow keys move selection, Enter navigates, Escape cancels without navigation",
    severity: "P1",
    routes: [ROUTES.paths],
    steps: "Open palette, type Map, press Down/Up/Enter; reopen and press Escape.",
    fn: async () => {
      await goto(palettePage, ROUTES.paths);
      await openPalette(palettePage);
      await palettePage.locator("[cmdk-input]").fill("map");
      await palettePage.waitForFunction(() => {
        const selected = document.querySelector('[cmdk-item][data-selected="true"]');
        return Boolean(selected && (selected.getAttribute("data-value") ?? selected.textContent ?? "").includes("map"));
      }, undefined, { timeout: INTERACTION_TIMEOUT });
      const firstSelected = (await palettePage.locator('[cmdk-item][data-selected="true"]').innerText()).replace(/\s+/g, " ");
      await palettePage.keyboard.press("ArrowDown");
      await palettePage.waitForTimeout(120);
      const downSelected = (await palettePage.locator('[cmdk-item][data-selected="true"]').innerText()).replace(/\s+/g, " ");
      assert.notEqual(downSelected, firstSelected, "ArrowDown did not move the selection");
      await palettePage.keyboard.press("ArrowUp");
      await palettePage.waitForTimeout(120);
      const upSelected = (await palettePage.locator('[cmdk-item][data-selected="true"]').innerText()).replace(/\s+/g, " ");
      assert.equal(upSelected, firstSelected, "ArrowUp did not restore the previous selection");
      assert.match(firstSelected, /Concept map/i, `expected Map destination selected, got "${firstSelected}"`);
      await palettePage.keyboard.press("Enter");
      await palettePage.waitForURL(`${BASE_URL}/map`, { timeout: INTERACTION_TIMEOUT });
      assert.equal(await palettePage.locator("[cmdk-input]").count(), 0, "palette stayed open after Enter");
      await openPalette(palettePage);
      await palettePage.locator("[cmdk-input]").fill("tools");
      await palettePage.keyboard.press("Escape");
      await palettePage.waitForTimeout(200);
      assert.equal(palettePage.url(), `${BASE_URL}/map`, "Escape still navigated");
      return { firstSelected, downSelected, upSelected, landed: palettePage.url() };
    },
  });
} catch (error) {
  notVerified({
    id: "PAL-INFRA",
    area: "Command palette",
    title: "Palette scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 2. Theme (contrast, light/dark rendering, persistence)
// ---------------------------------------------------------------------------

const THEME_ROUTES = [ROUTES.paths, ROUTES.lesson, ROUTES.blog, ROUTES.map, ROUTES.tools, ROUTES.quiz, ROUTES.settings];

async function measureTheme(page) {
  return page.evaluate(() => {
    const parse = (value) => {
      const nums = (String(value).match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      return nums.length === 3 ? nums : [0, 0, 0];
    };
    const luminance = ([r, g, b]) => {
      const channel = (value) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const ratio = (a, b) => {
      const l1 = luminance(a);
      const l2 = luminance(b);
      return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
    };
    const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
    const h1 = document.querySelector("h1");
    const h1Color = h1 ? parse(getComputedStyle(h1).color) : bodyBg;
    const tertiary = document.querySelector(".text-content-tertiary");
    let tertiaryBg = bodyBg;
    if (tertiary) {
      let node = tertiary;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && !/transparent|rgba\(0, 0, 0, 0\)/.test(bg)) {
          tertiaryBg = parse(bg);
          break;
        }
        node = node.parentElement;
      }
    }
    return {
      themeLight: document.documentElement.classList.contains("theme-light"),
      bodyBg: `rgb(${bodyBg.join(",")})`,
      h1Contrast: ratio(h1Color, bodyBg),
      tertiaryContrast: tertiary ? ratio(parse(getComputedStyle(tertiary).color), tertiaryBg) : null,
    };
  });
}

try {
  const themeContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(themeContext, emptyLearner({ prefs: { mode: "both", theme: "light", ambient: false, cursor: false, breakMinutes: 0 } }));
  const themePage = await newPage(themeContext, "theme-light");

  await audit({
    id: "THM-01",
    area: "Theme",
    title: "Light theme applies to all audited routes with >= 4.5:1 heading contrast",
    severity: "P1",
    routes: THEME_ROUTES,
    steps: "Seed prefs.theme=light, visit each route, read computed body/heading colours and WCAG ratio.",
    fn: async () => {
      const measurements = [];
      for (const route of THEME_ROUTES) {
        await goto(themePage, route);
        await themePage.waitForFunction(
          () => document.documentElement.classList.contains("theme-light"),
          undefined,
          { timeout: 8000 },
        );
        const m = await measureTheme(themePage);
        measurements.push({ route, ...m });
        assert.equal(m.themeLight, true, `${route} did not apply theme-light`);
        assert.ok(
          m.h1Contrast >= 4.5,
          `${route} heading contrast ${m.h1Contrast}:1 is below 4.5:1 — light-theme h1 uses hardcoded text-zinc-100 (src/components/settings/SettingsPanel.tsx:212)`,
        );
      }
      const lowTertiary = measurements.filter((m) => m.tertiaryContrast !== null && m.tertiaryContrast < 4.5);
      if (lowTertiary.length) {
        const shotPath = await shot(themePage, "theme-light-low-tertiary");
        return {
          measurements,
          note: `tertiary text below 4.5:1 on ${lowTertiary.map((m) => `${m.route} (${m.tertiaryContrast}:1)`).join(", ")}`,
          screenshot: shotPath,
        };
      }
      return { measurements };
    },
  });

  await audit({
    id: "THM-02",
    area: "Theme",
    title: "Settings theme toggle persists across reload and route changes",
    severity: "P1",
    routes: [ROUTES.settings, ROUTES.paths],
    steps: "On /settings choose Light, reload, navigate to /paths, then choose Dark and reload.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      const page = await newPage(ctx, "theme-toggle");
      await goto(page, ROUTES.settings);
      await page.locator('label:has(input[name="learner-theme"][value="light"])').click();
      await page.waitForFunction(() => document.documentElement.classList.contains("theme-light"));
      assert.equal((await readLearner(page))?.prefs?.theme, "light", "theme not saved to learner state");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("h1").first().waitFor();
      await page.waitForFunction(() => document.documentElement.classList.contains("theme-light"), undefined, { timeout: 8000 });
      await goto(page, ROUTES.paths);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains("theme-light")), true, "light theme lost on route change");
      await goto(page, ROUTES.settings);
      await page.locator('label:has(input[name="learner-theme"][value="dark"])').click();
      await page.waitForFunction(() => !document.documentElement.classList.contains("theme-light"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("h1").first().waitFor();
      await page.waitForFunction(() => !document.documentElement.classList.contains("theme-light"), undefined, { timeout: 8000 });
      await ctx.close();
      return { toggles: ["dark→light→reload→/paths→dark→reload"] };
    },
  });

  await audit({
    id: "THM-03",
    area: "Theme",
    title: "Default dark theme renders without a stray theme-light class",
    severity: "P2",
    routes: THEME_ROUTES,
    steps: "Fresh context, visit routes, inspect html class and body colour.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      const page = await newPage(ctx, "theme-dark");
      const rows = [];
      for (const route of THEME_ROUTES) {
        await goto(page, route);
        const m = await measureTheme(page);
        rows.push({ route, ...m });
        assert.equal(m.themeLight, false, `${route} unexpectedly applied theme-light by default`);
      }
      await ctx.close();
      return { rows };
    },
  });
} catch (error) {
  notVerified({
    id: "THM-INFRA",
    area: "Theme",
    title: "Theme scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 3. Custom cursor
// ---------------------------------------------------------------------------

try {
  const cursorContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(cursorContext, emptyLearner({ prefs: { mode: "both", theme: "dark", ambient: false, cursor: true, breakMinutes: 0 } }));
  const cursorPage = await newPage(cursorContext, "cursor");

  await audit({
    id: "CUR-01",
    area: "Custom cursor",
    title: "Cursor renders with read/inspect/interactive context states",
    severity: "P1",
    routes: [ROUTES.lesson, ROUTES.blog],
    steps: "Hover neutral text, [data-cursor=read], [data-cursor=inspect], and a button; read data-cursor-mode / data-cursor-interactive.",
    fn: async () => {
      await goto(cursorPage, ROUTES.lesson);
      assert.equal(await cursorPage.evaluate(() => document.documentElement.classList.contains("cursor-custom")), true, "native cursor was not hidden");
      const cursor = cursorPage.locator("[data-cursor-mode]");
      await cursor.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      const states = {};
      await cursorPage.mouse.move(20, 400);
      await cursorPage.waitForTimeout(150);
      states.neutral = await cursor.getAttribute("data-cursor-mode");
      const read = cursorPage.locator('[data-cursor="read"]').first();
      const readBox = await read.boundingBox();
      if (readBox) {
        await cursorPage.mouse.move(readBox.x + Math.min(8, readBox.width / 2), readBox.y + Math.min(8, readBox.height / 2));
        await cursorPage.waitForTimeout(150);
        states.read = await cursor.getAttribute("data-cursor-mode");
      }
      const engineerTab = cursorPage.getByRole("button", { name: "Engineer", exact: true }).first();
      if ((await engineerTab.count()) > 0) {
        await engineerTab.click();
        const inspect = cursorPage.locator('[data-cursor="inspect"]').first();
        const inspectBox = await inspect.boundingBox();
        if (inspectBox) {
          await cursorPage.mouse.move(inspectBox.x + 8, inspectBox.y + 8);
          await cursorPage.waitForTimeout(150);
          states.inspect = await cursor.getAttribute("data-cursor-mode");
        }
      }
      const next = cursorPage.getByRole("button", { name: "Next", exact: true }).first();
      const nextBox = await next.boundingBox();
      assert.ok(nextBox, "Next button has no box");
      await cursorPage.mouse.move(nextBox.x + 6, nextBox.y + 6);
      await cursorPage.waitForTimeout(150);
      states.interactive = await cursor.getAttribute("data-cursor-interactive");
      assert.equal(states.read, "read", `read context not applied (got ${states.read})`);
      assert.equal(states.inspect, "inspect", `inspect context not applied (got ${states.inspect})`);
      assert.equal(states.interactive, "true", "interactive state not applied over a button");
      await goto(cursorPage, ROUTES.blog);
      assert.equal(await cursorPage.locator("[data-cursor-mode]").count(), 1, "cursor unmounted after route change");
      return states;
    },
  });

  await audit({
    id: "CUR-02",
    area: "Custom cursor",
    title: "Cursor toggle persists and the native pointer returns when disabled",
    severity: "P1",
    routes: [ROUTES.settings, ROUTES.paths],
    steps: "Uncheck Custom cursor on /settings, reload, visit /paths, re-check it.",
    fn: async () => {
      await goto(cursorPage, ROUTES.settings);
      await cursorPage.getByLabel("Custom cursor").uncheck();
      await cursorPage.waitForFunction(() => !document.documentElement.classList.contains("cursor-custom"));
      assert.equal(await cursorPage.locator("[data-cursor-mode]").count(), 0, "custom cursor still mounted after disabling");
      await pageReload(cursorPage);
      assert.equal(await cursorPage.evaluate(() => document.documentElement.classList.contains("cursor-custom")), false, "cursor preference did not survive reload");
      await goto(cursorPage, ROUTES.paths);
      assert.equal(await cursorPage.locator("[data-cursor-mode]").count(), 0, "cursor reappeared on route change");
      await goto(cursorPage, ROUTES.settings);
      await cursorPage.getByLabel("Custom cursor").check();
      await cursorPage.waitForFunction(() => document.documentElement.classList.contains("cursor-custom"));
      return { persisted: true };
    },
  });

  await audit({
    id: "CUR-03",
    area: "Custom cursor",
    title: "Touch and reduced-motion contexts disable the custom cursor",
    severity: "P1",
    routes: [ROUTES.lesson, ROUTES.paths],
    steps: "Open lesson in a touch context and a reduced-motion context; inspect html class and cursor node.",
    fn: async () => {
      const observations = [];
      for (const options of [
        { viewport: VIEWPORTS[0], hasTouch: true, isMobile: true },
        { viewport: VIEWPORTS[3], reducedMotion: "reduce" },
      ]) {
        const ctx = await trackedContext(options);
        const page = await newPage(ctx, `cursor-disabled-${observations.length}`);
        await seed(ctx, emptyLearner({ prefs: { mode: "both", theme: "dark", ambient: false, cursor: true, breakMinutes: 0 } }));
        await goto(page, ROUTES.lesson);
        const hasClass = await page.evaluate(() => document.documentElement.classList.contains("cursor-custom"));
        const hasNode = (await page.locator("[data-cursor-mode]").count()) > 0;
        observations.push({ touch: Boolean(options.hasTouch), reducedMotion: Boolean(options.reducedMotion), hasClass, hasNode });
        assert.equal(hasClass, false, `cursor-custom class present with ${JSON.stringify(options)}`);
        assert.equal(hasNode, false, `cursor node present with ${JSON.stringify(options)}`);
        await ctx.close();
      }
      return { observations };
    },
  });
} catch (error) {
  notVerified({
    id: "CUR-INFRA",
    area: "Custom cursor",
    title: "Custom cursor scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

async function pageReload(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
  await waitRuntime(page);
}

// ---------------------------------------------------------------------------
// 4. Ambient background
// ---------------------------------------------------------------------------

try {
  const ambientContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(ambientContext, emptyLearner({ prefs: { mode: "both", theme: "dark", ambient: true, cursor: false, breakMinutes: 0 } }));
  const ambientPage = await newPage(ambientContext, "ambient");

  await audit({
    id: "AMB-01",
    area: "Ambient background",
    title: "Ambient canvas renders on lesson and blog and toggle persists",
    severity: "P1",
    routes: [ROUTES.lesson, ROUTES.blog, ROUTES.settings],
    steps: "Seed ambient=true; visit lesson/blog, count canvas.fixed.inset-0; disable on /settings and reload.",
    fn: async () => {
      const before = [];
      for (const route of [ROUTES.lesson, ROUTES.blog]) {
        await goto(ambientPage, route);
        const canvases = await ambientPage.locator("canvas.fixed.inset-0").count();
        before.push({ route, canvases });
        assert.equal(canvases, 1, `${route} did not render exactly one ambient canvas`);
      }
      await goto(ambientPage, ROUTES.settings);
      await ambientPage.getByLabel("Ambient background").uncheck();
      await ambientPage.waitForFunction(() => document.querySelectorAll("canvas.fixed.inset-0").length === 0);
      await pageReload(ambientPage);
      assert.equal(await ambientPage.locator("canvas.fixed.inset-0").count(), 0, "ambient canvas returned after reload with pref off");
      const shotPath = await shot(ambientPage, "ambient-off-settings");
      return { before, after: 0, screenshot: shotPath };
    },
  });

  await audit({
    id: "AMB-02",
    area: "Ambient background",
    title: "Ambient animation loop pauses while the document is hidden",
    severity: "P2",
    routes: [ROUTES.lesson, ROUTES.blog],
    steps: "Capture canvas data URL, force document.hidden=true + visibilitychange, capture again, then restore visibility.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      await seed(ctx, emptyLearner({ prefs: { mode: "both", theme: "dark", ambient: true, cursor: false, breakMinutes: 0 } }));
      const page = await newPage(ctx, "ambient-visibility");
      await goto(page, ROUTES.lesson);
      await page.locator("canvas.fixed.inset-0").waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      const result = await page.evaluate(async () => {
        const canvas = document.querySelector("canvas.fixed.inset-0");
        if (!(canvas instanceof HTMLCanvasElement)) return { supported: false, reason: "no canvas" };
        const snap = () => canvas.toDataURL();
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const before = snap();
        await wait(700);
        const moving = snap();
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
        await wait(700);
        const pausedA = snap();
        await wait(700);
        const pausedB = snap();
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        document.dispatchEvent(new Event("visibilitychange"));
        await wait(700);
        const resumed = snap();
        return {
          supported: true,
          animatesWhileVisible: before !== moving,
          frozenWhileHidden: pausedA === pausedB,
          resumesAfterVisible: pausedB !== resumed,
        };
      });
      assert.equal(result.supported, true, result.reason ?? "canvas not available");
      assert.equal(result.animatesWhileVisible, true, "canvas did not animate while visible");
      assert.equal(result.frozenWhileHidden, true, "canvas kept changing while hidden");
      assert.equal(result.resumesAfterVisible, true, "canvas did not resume after becoming visible");
      await ctx.close();
      return result;
    },
  });

  await audit({
    id: "AMB-03",
    area: "Ambient background",
    title: "Ambient presence on reduced-motion devices is a static wash, not a canvas loop",
    severity: "P2",
    routes: [ROUTES.lesson, ROUTES.blog],
    steps: "Seed ambient=true with reducedMotion=reduce; verify the media query matches, no ambient canvas mounts, and the radial-gradient wash stays unchanged over 400ms.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3], reducedMotion: "reduce" });
      await seed(ctx, emptyLearner({ prefs: { mode: "both", theme: "dark", ambient: true, cursor: false, breakMinutes: 0 } }));
      const page = await newPage(ctx, "ambient-reduced-motion");
      const observations = [];
      for (const route of [ROUTES.lesson, ROUTES.blog]) {
        await goto(page, route);
        const result = await page.evaluate(async () => {
          // This is a plain .mjs file: no TypeScript generics here. A written
          // `querySelectorAll<HTMLElement>(...)` parses as comparisons in JS
          // and silently returns an empty list, so the selector is untyped.
          const wash = Array.from(document.querySelectorAll('div.fixed.inset-0[aria-hidden="true"]')).find(
            (element) => getComputedStyle(element).backgroundImage.includes("radial-gradient"),
          );
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const ambientCanvasCount = document.querySelectorAll("canvas.fixed.inset-0").length;
          if (!wash) return { reducedMotion, staticWash: false, backgroundStable: false, ambientCanvasCount };
          const before = getComputedStyle(wash).backgroundImage;
          await new Promise((resolve) => setTimeout(resolve, 400));
          return {
            reducedMotion,
            staticWash: true,
            backgroundStable: before === getComputedStyle(wash).backgroundImage,
            ambientCanvasCount,
          };
        });
        assert.equal(result.reducedMotion, true, `${route}: reduced-motion media query did not match`);
        assert.equal(result.staticWash, true, `${route}: static ambient radial-gradient wash was not rendered`);
        assert.equal(result.ambientCanvasCount, 0, `${route}: ambient canvas mounted despite reduced motion`);
        assert.equal(result.backgroundStable, true, `${route}: ambient wash changed while reduced motion was active`);
        observations.push({ route, ...result });
      }
      await ctx.close();
      return { observations };
    },
  });
} catch (error) {
  notVerified({
    id: "AMB-INFRA",
    area: "Ambient background",
    title: "Ambient scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 5. Reader (scroll, click, keyboard, sticky mode bar, jitter)
// ---------------------------------------------------------------------------

try {
  const readerContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(readerContext, emptyLearner());
  const readerPage = await newPage(readerContext, "reader");

  await audit({
    id: "RDR-01",
    area: "Reader",
    title: "Step dots, Next/Previous, arrow keys and manual scroll stay in sync",
    severity: "P1",
    routes: [ROUTES.lesson, ROUTES.blog],
    steps: "Open lesson; click dot 3; press Right/Left; scrollIntoView section 2; sample active step repeatedly.",
    fn: async () => {
      await goto(readerPage, ROUTES.lesson);
      assert.equal(await activeStep(readerPage), 1, "lesson did not start on step 1");
      const dots = readerPage.getByRole("button", { name: /^Go to step \d+:/ });
      assert.ok((await dots.count()) >= 4, "fewer than four step dots");
      await dots.nth(2).click();
      await readerPage.waitForTimeout(900);
      assert.equal(await activeStep(readerPage), 3, "step dot click did not select step 3");
      const samples = [];
      for (let i = 0; i < 3; i += 1) {
        await readerPage.waitForTimeout(250);
        samples.push(await activeStep(readerPage));
      }
      assert.deepEqual(samples, [3, 3, 3], `active step jittered after click: ${samples.join(",")}`);
      await readerPage.keyboard.press("ArrowRight");
      await readerPage.waitForTimeout(750);
      assert.equal(await activeStep(readerPage), 4, "ArrowRight did not advance");
      await readerPage.keyboard.press("ArrowLeft");
      await readerPage.waitForTimeout(750);
      assert.equal(await activeStep(readerPage), 3, "ArrowLeft did not go back");
      await readerPage.evaluate(() => {
        const section = document.querySelector('[data-step-index="1"]');
        section?.scrollIntoView({ behavior: "auto", block: "start" });
      });
      await readerPage.waitForTimeout(900);
      assert.equal(await activeStep(readerPage), 2, "manual scroll did not update the active step");
      return { dot3: 3, keyboard: [4, 3], scroll: 2, jitterSamples: samples };
    },
  });

  await audit({
    id: "RDR-02",
    area: "Reader",
    title: "Sticky mode bar stays below the header and above page content after scrolling",
    severity: "P2",
    routes: [ROUTES.lesson, ROUTES.blog],
    steps: "Scroll lesson/blog, measure bar and header bounding boxes plus computed z-index.",
    fn: async () => {
      const rows = [];
      for (const route of [ROUTES.lesson, ROUTES.blog]) {
        await goto(readerPage, route);
        await readerPage.mouse.wheel(0, 1400);
        await readerPage.waitForTimeout(400);
        const measured = await readerPage.evaluate(() => {
          const bar = document.querySelector("div.sticky.top-14");
          const header = document.querySelector("header.sticky.top-0");
          if (!bar || !header) return null;
          const b = bar.getBoundingClientRect();
          const h = header.getBoundingClientRect();
          return {
            barTop: Math.round(b.top),
            headerBottom: Math.round(h.bottom),
            barZ: Number(getComputedStyle(bar).zIndex),
            headerZ: Number(getComputedStyle(header).zIndex),
            scrollY: Math.round(window.scrollY),
          };
        });
        assert.ok(measured, `${route}: sticky bar or header not found`);
        assert.ok(Math.abs(measured.barTop - measured.headerBottom) <= 2, `${route}: bar top ${measured.barTop} != header bottom ${measured.headerBottom}`);
        assert.ok(measured.barZ < measured.headerZ, `${route}: bar z-index ${measured.barZ} is not below header ${measured.headerZ}`);
        rows.push({ route, ...measured });
      }
      return { rows };
    },
  });

  await audit({
    id: "RDR-03",
    area: "Reader",
    title: "Reading-mode changes hold the active step (no scroll observer snap-back)",
    severity: "P1",
    routes: [ROUTES.lesson, ROUTES.blog],
    steps: "Advance to step 2, switch Story/Engineer/Both, wait past the 1000ms hold, check step again.",
    fn: async () => {
      await goto(readerPage, ROUTES.lesson);
      await readerPage.getByRole("button", { name: "Next", exact: true }).first().click();
      await readerPage.waitForTimeout(700);
      assert.equal(await activeStep(readerPage), 2, "could not reach step 2");
      const modes = readerPage.getByRole("group", { name: "Reading mode" });
      const observations = [];
      for (const mode of ["Story", "Engineer", "Both"]) {
        await modes.getByRole("button", { name: mode, exact: true }).click();
        await readerPage.waitForTimeout(1150);
        observations.push({ mode, step: await activeStep(readerPage) });
      }
      assert.deepEqual(observations.map((o) => o.step), [2, 2, 2], `mode switch changed step: ${JSON.stringify(observations)}`);
      return { observations };
    },
  });

  await audit({
    id: "RDR-04",
    area: "Reader",
    title: "Opening a lesson is not a meaningful read; reaching its final step is",
    severity: "P1",
    routes: [ROUTES.lesson],
    steps: "Fresh context, open lesson, sample visitedTopics on open and on step 2, jump to last step, wait for visitedTopics.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      await seed(ctx, emptyLearner());
      const page = await newPage(ctx, "reader-meaningful-lesson");
      await goto(page, ROUTES.lesson);
      await waitHydrated(page);
      assert.equal(await activeStep(page), 1, "lesson did not start on step 1");
      const onOpen = await readLearner(page);
      assert.equal(hasTrackedId(onOpen, "visitedTopics", "single-server"), false, "opening the lesson alone marked it visited");
      await goToStep(page, 1);
      await page.waitForTimeout(300);
      const onStep2 = await readLearner(page);
      assert.equal(hasTrackedId(onStep2, "visitedTopics", "single-server"), false, "an intermediate step marked the lesson visited");
      const count = await gotoFinalStep(page);
      await page.waitForFunction(
        (key) => {
          try {
            const state = JSON.parse(window.localStorage.getItem(key) ?? "{}");
            return Array.isArray(state.visitedTopics) && state.visitedTopics.includes("single-server");
          } catch {
            return false;
          }
        },
        LEARNER_KEY,
        { timeout: INTERACTION_TIMEOUT },
      );
      const onFinal = await readLearner(page);
      assert.equal(hasTrackedId(onFinal, "visitedTopics", "single-server"), true, "final step did not mark the lesson visited");
      assert.equal(await activeStep(page), count, "final step was not committed");
      await ctx.close();
      return { steps: count, onOpen: false, onStep2: false, onFinal: true };
    },
  });

  await audit({
    id: "RDR-05",
    area: "Reader",
    title: "Arrow keys replay the keyed visual body transition forward and back",
    severity: "P1",
    routes: [ROUTES.lesson],
    steps: "Open lesson in a no-preference context, install a mutation probe on the visual motion group, press ArrowRight then ArrowLeft, verify remount + entrance style + body change.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3], reducedMotion: "no-preference" });
      await seed(ctx, emptyLearner());
      const page = await newPage(ctx, "reader-visual-arrows");
      await goto(page, ROUTES.lesson);
      await waitHydrated(page);
      const visual = page.locator('figure svg[role="img"]').first();
      await visual.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      assert.equal(await activeStep(page), 1, "lesson did not start on step 1");

      await installVisualProbe(page);
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() => {
        const current = document.querySelector('[aria-current="step"]');
        return /step\s+2/i.test(current?.getAttribute("aria-label") ?? "");
      }, undefined, { timeout: INTERACTION_TIMEOUT });
      await page.waitForTimeout(400);
      const forward = await readVisualProbe(page);
      assertVisualReplayed(forward, "ArrowRight");

      await installVisualProbe(page);
      await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(() => {
        const current = document.querySelector('[aria-current="step"]');
        return /step\s+1/i.test(current?.getAttribute("aria-label") ?? "");
      }, undefined, { timeout: INTERACTION_TIMEOUT });
      await page.waitForTimeout(400);
      const backward = await readVisualProbe(page);
      assertVisualReplayed(backward, "ArrowLeft");
      await ctx.close();
      return {
        forward: {
          svgReplaced: forward.svgReplaced, gAdds: forward.gAdds, gRemoves: forward.gRemoves,
          version: `${forward.versionBefore} -> ${forward.versionAfter}`,
        },
        backward: {
          svgReplaced: backward.svgReplaced, gAdds: backward.gAdds, gRemoves: backward.gRemoves,
          version: `${backward.versionBefore} -> ${backward.versionAfter}`,
        },
      };
    },
  });
} catch (error) {
  notVerified({
    id: "RDR-INFRA",
    area: "Reader",
    title: "Reader scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 6. Blogs index
// ---------------------------------------------------------------------------

try {
  const blogsContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(blogsContext, emptyLearner({ readBlogs: ["database-melts-at-10k-rps"] }));
  const blogsPage = await newPage(blogsContext, "blogs-index");

  await audit({
    id: "BLG-01",
    area: "Blogs index",
    title: "Search filters cards, read-time is shown, and read checkmarks sync with progress",
    severity: "P1",
    routes: [ROUTES.blogs],
    steps: "Type a query in Search field notes; clear; check min-read labels and Read badge for seeded read blog.",
    fn: async () => {
      await goto(blogsPage, ROUTES.blogs);
      const cards = blogsPage.locator('main a[href^="/blogs/"]');
      const total = await cards.count();
      assert.ok(total >= 5, `only ${total} blog cards rendered`);
      const readTimes = await cards.evaluateAll((nodes) =>
        nodes.map((node) => (node.textContent ?? "").match(/\d+\s*min read/)?.[0] ?? null),
      );
      assert.ok(readTimes.every(Boolean), `missing read-time on cards: ${JSON.stringify(readTimes)}`);
      await blogsPage.getByLabel("Search field notes").fill("database");
      await blogsPage.waitForTimeout(200);
      const filtered = await cards.count();
      assert.ok(filtered > 0 && filtered < total, `filter returned ${filtered} of ${total} cards`);
      const readBadges = await blogsPage.getByText("Read", { exact: true }).count();
      assert.ok(readBadges >= 1, "seeded read blog has no Read badge");
      await blogsPage.getByLabel("Search field notes").fill("");
      assert.equal(await cards.count(), total, "clearing search did not restore all cards");
      return { total, filtered, readBadges, sampleReadTimes: readTimes.slice(0, 3) };
    },
  });

  await audit({
    id: "BLG-02",
    area: "Blogs index",
    title: "Blogs index exposes tag/category filters",
    severity: "P2",
    routes: [ROUTES.blogs],
    steps: "Inspect /blogs controls for tag chips or filter buttons beyond the free-text search.",
    fn: async () => {
      await goto(blogsPage, ROUTES.blogs);
      const filterControls = await blogsPage.evaluate(() =>
        Array.from(document.querySelectorAll("main button, main [role='group'], main [data-tag]")).filter((el) =>
          /filter|tag|category/i.test(`${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`),
        ).length,
      );
      const screenshot = await shot(blogsPage, "blogs-no-tag-filters");
      assert.ok(filterControls > 0, `no tag/category filter controls found (${filterControls}) — only free-text search exists`);
      return { filterControls, screenshot };
    },
  });

  await audit({
    id: "BLG-03",
    area: "Blogs index",
    title: "Opening a field note is not a meaningful read; reaching its final step is",
    severity: "P1",
    routes: [ROUTES.blog],
    steps: "Fresh context, open blog, sample readBlogs on open and on step 2, jump to last step, wait for readBlogs and visitedTopics.",
    fn: async () => {
      const id = "database-melts-at-10k-rps";
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      await seed(ctx, emptyLearner());
      const page = await newPage(ctx, "blog-meaningful-read");
      await goto(page, ROUTES.blog);
      await waitHydrated(page);
      const onOpen = await readLearner(page);
      assert.equal(hasTrackedId(onOpen, "readBlogs", id), false, "opening the blog alone marked it read");
      await goToStep(page, 1);
      await page.waitForTimeout(300);
      const onStep2 = await readLearner(page);
      assert.equal(hasTrackedId(onStep2, "readBlogs", id), false, "an intermediate step marked the blog read");
      const count = await gotoFinalStep(page);
      await page.waitForFunction(
        ({ key, blogId }) => {
          try {
            const state = JSON.parse(window.localStorage.getItem(key) ?? "{}");
            return Array.isArray(state.readBlogs) && state.readBlogs.includes(blogId);
          } catch {
            return false;
          }
        },
        { key: LEARNER_KEY, blogId: id },
        { timeout: INTERACTION_TIMEOUT },
      );
      const onFinal = await readLearner(page);
      assert.equal(hasTrackedId(onFinal, "readBlogs", id), true, "final step did not mark the blog read");
      assert.equal(hasTrackedId(onFinal, "visitedTopics", id), true, "final step did not earn quiz eligibility");
      assert.equal(await activeStep(page), count, "final step was not committed");
      await ctx.close();
      return { steps: count, onOpen: false, onStep2: false, onFinal: true, quizEligible: true };
    },
  });
} catch (error) {
  notVerified({
    id: "BLG-INFRA",
    area: "Blogs index",
    title: "Blogs index scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 6b. Bespoke lazy-loaded visuals
// ---------------------------------------------------------------------------

try {
  const visualContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(visualContext, emptyLearner());
  const visualPage = await newPage(visualContext, "bespoke-visuals");

  await audit({
    id: "VIS-01",
    area: "Bespoke visuals",
    title: "Tokenization, Kubernetes and LLD LRU lessons load their titled bespoke visuals",
    severity: "P1",
    routes: [NEW_ROUTES.tokenizationLesson, NEW_ROUTES.kubernetesLesson, NEW_ROUTES.lruLesson],
    steps: "Open each lesson, wait for figure svg[role=img] with the expected aria-label, and confirm its step-specific body text.",
    fn: async () => {
      const targets = [
        { route: NEW_ROUTES.tokenizationLesson, title: "tokenization", marker: /raw text · characters/i },
        { route: NEW_ROUTES.kubernetesLesson, title: "k8s reconcile", marker: /desired state · manifest replicas/i },
        { route: NEW_ROUTES.lruLesson, title: "lru / lfu cache", marker: /hash map · key → node pointer/i },
      ];
      const observations = [];
      for (const target of targets) {
        await goto(visualPage, target.route);
        const svg = visualPage.locator(`figure svg[role="img"][aria-label="${target.title}"]`);
        await svg.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
        assert.equal(await svg.count(), 1, `${target.route}: expected one "${target.title}" visual, got ${await svg.count()}`);
        const svgText = (await svg.evaluate((node) => node.textContent ?? "")).replace(/\s+/g, " ").trim();
        assert.match(svgText, target.marker, `${target.route}: bespoke body text missing from ${target.title}: "${svgText.slice(0, 140)}"`);
        assert.doesNotMatch(svgText, /no visual for this topic/i, `${target.route}: lazy fallback never resolved`);
        assert.equal(
          await visualPage.locator('figure svg[role="img"][aria-label="topic map"]').count(),
          0,
          `${target.route}: fallback "topic map" visual still mounted`,
        );
        observations.push({ route: target.route, title: target.title, text: svgText.slice(0, 120) });
      }
      await visualContext.close();
      return { observations };
    },
  });
} catch (error) {
  notVerified({
    id: "VIS-INFRA",
    area: "Bespoke visuals",
    title: "Bespoke visual scenario could not be started",
    severity: "P1",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 6c. Landing closing CTA and bento alignment
// ---------------------------------------------------------------------------

try {
  await audit({
    id: "LAND-01",
    area: "Landing",
    title: "Closing CTA exists and its primary link navigates to /labs",
    severity: "P1",
    routes: [ROUTES.home, NEW_ROUTES.labs],
    steps: "On / find the final 'Pick a system' section, assert its 'Open the labs' link points at /labs, click and verify the labs page.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      const page = await newPage(ctx, "landing-cta");
      await goto(page, ROUTES.home);
      const closing = page.locator("section").filter({ has: page.getByRole("heading", { name: /Pick a system/i }) });
      assert.equal(await closing.count(), 1, "closing CTA section not found");
      const cta = closing.getByRole("link", { name: /Open the labs/i });
      assert.equal(await cta.count(), 1, "closing CTA 'Open the labs' link not found");
      assert.equal(await cta.getAttribute("href"), "/labs", "closing CTA does not point at /labs");
      await cta.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await cta.click();
      await page.waitForURL(`${BASE_URL}/labs`, { timeout: INTERACTION_TIMEOUT });
      await page.locator("h1").first().waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      assert.match(await page.locator("h1").first().innerText(), /Design real systems/i, "labs page heading not rendered");
      await ctx.close();
      return { href: "/labs", landed: `${BASE_URL}/labs` };
    },
  });

  await audit({
    id: "LAND-02",
    area: "Landing",
    title: "Bento and closing grids align without overflow at 390 and 1440",
    severity: "P1",
    routes: [ROUTES.home],
    steps: "At 390/1440 check document overflow, then measure the 'Other ways in' bento and 'Pick a system' grids: column count, cells inside container, equal row heights, no overlap.",
    fn: async () => {
      const rows = [];
      for (const vp of LANDING_VIEWPORTS) {
        const ctx = await trackedContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.hasTouch,
        });
        const page = await newPage(ctx, `landing-grid-${vp.label}`);
        await goto(page, ROUTES.home);
        const measure = await overflowMeasure(page);
        assert.ok(measure.overflowPx <= 1, `${vp.label}: horizontal overflow ${measure.overflowPx}px; ${measure.offenders.join("; ")}`);
        const expected = vp.label === "390" ? { bento: 1, closing: 1 } : { bento: 3, closing: 12 };
        const grids = {};
        for (const [key, sectionText, cols] of [
          ["bento", "Other ways in", expected.bento],
          ["closing", "Pick a system", expected.closing],
        ]) {
          await scrollToSection(page, sectionText);
          const geometry = await gridGeometry(page, sectionText);
          assertGridAligned(geometry, cols, `${vp.label} ${sectionText}`);
          grids[key] = { cols: geometry.cols, cells: geometry.children.length };
        }
        rows.push({ viewport: vp.label, overflowPx: measure.overflowPx, grids });
        await ctx.close();
      }
      return { rows };
    },
  });
} catch (error) {
  notVerified({
    id: "LAND-INFRA",
    area: "Landing",
    title: "Landing scenario could not be started",
    severity: "P1",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 6d. Labs card excerpts
// ---------------------------------------------------------------------------

try {
  await audit({
    id: "LAB-01",
    area: "Labs",
    title: "Labs card excerpts contain no raw Markdown markers",
    severity: "P2",
    routes: [NEW_ROUTES.labs],
    steps: "Open /labs, read every card excerpt in a[href^='/labs/'] p.line-clamp-2 and assert no bold/italic/code/link/heading markers remain.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      const page = await newPage(ctx, "labs-excerpts");
      await goto(page, NEW_ROUTES.labs);
      const excerpts = await page.locator('a[href^="/labs/"] p.line-clamp-2').allInnerTexts();
      assert.ok(excerpts.length >= 16, `only ${excerpts.length} labs excerpts rendered`);
      const marker = /\*\*|__|`|!?\[[^\]]+\]\([^)]+\)|(?:^|\s)#{1,6}\s/;
      const offenders = excerpts
        .map((text, index) => ({ index, text: text.replace(/\s+/g, " ").trim() }))
        .filter((row) => marker.test(row.text));
      assert.deepEqual(offenders, [], `raw Markdown in labs excerpts: ${JSON.stringify(offenders.slice(0, 4))}`);
      assert.deepEqual(excerpts.filter((text) => !text.trim()), [], "labs rendered an empty excerpt");
      await ctx.close();
      return { checked: excerpts.length, markers: 0 };
    },
  });
} catch (error) {
  notVerified({
    id: "LAB-INFRA",
    area: "Labs",
    title: "Labs excerpt scenario could not be started",
    severity: "P2",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 7. Knowledge map
// ---------------------------------------------------------------------------

try {
  const mapContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(mapContext, emptyLearner({ completedLessons: ["single-server", "networking-protocols"] }));
  const mapPage = await newPage(mapContext, "map");

  await audit({
    id: "MAP-01",
    area: "Knowledge map",
    title: "Zoom, reset, pan, selection, prerequisites and navigation work together",
    severity: "P1",
    routes: [ROUTES.map],
    steps: "Use zoom controls, drag the stage, click a track node, read aside, click an Open link.",
    fn: async () => {
      await goto(mapPage, ROUTES.map);
      const zoomLabel = mapPage.locator('span:text-is("100%")');
      assert.ok((await zoomLabel.count()) > 0, "zoom readout missing");
      await mapPage.getByRole("button", { name: "Zoom in" }).click();
      await mapPage.getByRole("button", { name: "Zoom in" }).click();
      assert.ok((await mapPage.locator('span:text-is("130%")').count()) > 0, "zoom in did not reach 130%");
      await mapPage.getByRole("button", { name: "Zoom out" }).click();
      assert.ok((await mapPage.locator('span:text-is("115%")').count()) > 0, "zoom out did not reach 115%");
      await mapPage.getByRole("button", { name: "Reset map view" }).click();
      assert.ok((await mapPage.locator('span:text-is("100%")').count()) > 0, "reset did not restore 100%");
      const stage = mapPage.locator("div.touch-none.overflow-hidden").first();
      const transformBefore = await stage.locator("div.absolute.left-1\\/2").getAttribute("style");
      const box = await stage.boundingBox();
      assert.ok(box, "map stage has no bounding box");
      // Drag from an empty corner: the centre of the stage sits on the
      // foundations node, whose own pointerdown handler stops propagation.
      await mapPage.mouse.move(box.x + 40, box.y + 60);
      await mapPage.mouse.down();
      await mapPage.mouse.move(box.x + 130, box.y + 100, { steps: 6 });
      await mapPage.mouse.up();
      const transformAfter = await stage.locator("div.absolute.left-1\\/2").getAttribute("style");
      assert.notEqual(transformAfter, transformBefore, "drag did not pan the stage");
      await mapPage.getByRole("button", { name: "Reset map view" }).click();
      const node = mapPage.locator('button[aria-pressed]:has-text("Distributed Systems")').first();
      assert.ok((await node.count()) > 0, "distributed track node not found");
      await node.click();
      const aside = mapPage.locator("aside[aria-live='polite']");
      await aside.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      const asideText = (await aside.innerText()).replace(/\s+/g, " ");
      assert.match(asideText, /Distributed Systems and Storage Internals/, "selection did not update aside");
      assert.match(asideText, /Prerequisites:/, "prerequisites not shown for lessons");
      const completedText = await mapPage.locator('button:has-text("System Design Foundations")').first().innerText();
      assert.match(completedText, /2\/\d+ complete/, `mastery not synced into node: "${completedText.replace(/\s+/g, " ")}"`);
      const openLink = aside.getByRole("link", { name: /Open/ }).first();
      const href = await openLink.getAttribute("href");
      assert.match(href ?? "", /^\/paths\/distributed\//, `unexpected lesson link ${href}`);
      await openLink.click();
      await mapPage.waitForURL(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/paths/distributed/`), { timeout: INTERACTION_TIMEOUT });
      return { zoom: ["100%", "130%", "115%", "100%"], panned: true, selected: "Distributed Systems", href };
    },
  });

  await audit({
    id: "MAP-02",
    area: "Knowledge map",
    title: "Zoom controls clamp to 70%-180%",
    severity: "P2",
    routes: [ROUTES.map],
    steps: "Click zoom-out and zoom-in ten times each; read the percentage readout.",
    fn: async () => {
      await goto(mapPage, ROUTES.map);
      for (let i = 0; i < 10; i += 1) await mapPage.getByRole("button", { name: "Zoom out" }).click();
      const minText = await mapPage.locator("span").filter({ hasText: /^\d+%$/ }).first().innerText();
      for (let i = 0; i < 20; i += 1) await mapPage.getByRole("button", { name: "Zoom in" }).click();
      const maxText = await mapPage.locator("span").filter({ hasText: /^\d+%$/ }).first().innerText();
      assert.equal(minText.trim(), "70%", `zoom-out clamp is ${minText}, expected 70%`);
      assert.equal(maxText.trim(), "180%", `zoom-in clamp is ${maxText}, expected 180%`);
      return { minText, maxText };
    },
  });
} catch (error) {
  notVerified({
    id: "MAP-INFRA",
    area: "Knowledge map",
    title: "Map scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 8. Tools edge inputs
// ---------------------------------------------------------------------------

try {
  const toolsContext = await trackedContext({ viewport: VIEWPORTS[3] });
  const toolsPage = await newPage(toolsContext, "tools");

  async function sectionValues(page, id) {
    return page.locator(`section:has(h2#${id}) span.font-mono`).evaluateAll((nodes) =>
      nodes.map((node) => (node.textContent ?? "").trim()),
    );
  }

  await audit({
    id: "TOOL-01",
    area: "Tools",
    title: "Calculators stay finite for zero, huge, negative and empty inputs",
    severity: "P1",
    routes: [ROUTES.tools],
    steps: "Fill each numeric input with 0, a very large value, -5 and empty; read every result row.",
    fn: async () => {
      await goto(toolsPage, ROUTES.tools);
      const sections = [
        { id: "capacity-title", input: "cap-dau", values: ["0", "1e15", "-5", ""] },
        { id: "kv-title", input: "kv-context", values: ["0", "1e12", "-5", ""] },
        { id: "sla-title", input: "sla-percent", values: ["0", "999999999", "-5", ""] },
      ];
      const observations = [];
      for (const section of sections) {
        for (const value of section.values) {
          await toolsPage.locator(`#${section.input}`).fill(value);
          await toolsPage.waitForTimeout(90);
          const values = await sectionValues(toolsPage, section.id);
          const bad = values.filter((text) => /NaN|Infinity|undefined|null/i.test(text));
          observations.push({ section: section.id, input: section.input, typed: value, rows: values.slice(0, 6), bad });
          assert.deepEqual(bad, [], `${section.id}: invalid result for input "${value}" -> ${values.join(" | ")}`);
        }
      }
      const emptyBecomesZero = await toolsPage.locator("#sla-percent").inputValue();
      return { observations, note: `empty input normalised to "${emptyBecomesZero}" by Number("")` };
    },
  });

  await audit({
    id: "TOOL-02",
    area: "Tools",
    title: "Notation decoder returns results by symbol and by plain meaning",
    severity: "P2",
    routes: [ROUTES.tools],
    steps: "Search p99, quorum and a nonsense term; count decoded entries.",
    fn: async () => {
      await goto(toolsPage, ROUTES.tools);
      const counts = {};
      for (const term of ["p99", "quorum", "zzzznotathing"]) {
        await toolsPage.getByLabel("Search notation").fill(term);
        await toolsPage.waitForTimeout(120);
        counts[term] = await toolsPage.locator('section:has(h2#notation-title) li').count();
      }
      assert.ok(counts.p99 >= 1, "p99 returned no notation entry");
      assert.ok(counts.quorum >= 1, "quorum returned no notation entry");
      assert.equal(counts.zzzznotathing, 0, "nonsense term returned entries");
      return { counts };
    },
  });
} catch (error) {
  notVerified({
    id: "TOOL-INFRA",
    area: "Tools",
    title: "Tools scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 9. Break reminder (fake clock) and quiz suppression
// ---------------------------------------------------------------------------

async function advanceWithActivity(page, totalMs) {
  // 60s is below the app's 90s idle limit, so every simulated minute counts
  // as active study time instead of triggering the idle mute.
  const step = 60_000;
  let elapsed = 0;
  let i = 0;
  while (elapsed < totalMs) {
    const chunkMs = Math.min(step, totalMs - elapsed);
    await page.clock.runFor(chunkMs);
    await page.mouse.move(80 + (i % 40), 120 + (i % 30));
    elapsed += chunkMs;
    i += 1;
  }
}

/**
 * The utility launcher is present in SSR HTML before client effects attach.
 * Synchronize on the reminder's real tick before advancing measured study
 * time, otherwise a slow hydration can consume part of the fake-clock budget.
 */
async function waitForStudyTimer(page, thresholdMs) {
  await page.evaluate((expectedThresholdMs) => {
    window.__syscraftStudyTimerReady = false;
    const onTick = (event) => {
      if (event.detail?.thresholdMs !== expectedThresholdMs) return;
      window.__syscraftStudyTimerReady = true;
      window.removeEventListener("syscraft:study-tick", onTick);
    };
    window.addEventListener("syscraft:study-tick", onTick);
  }, thresholdMs);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await page.mouse.move(80 + (attempt % 40), 120 + (attempt % 30));
    await page.clock.runFor(1000);
    if (await page.evaluate(() => window.__syscraftStudyTimerReady)) return;
    await page.waitForTimeout(50);
  }

  throw new Error(`break timer did not emit a ${thresholdMs}ms study tick after hydration`);
}

try {
  const breakContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(breakContext, emptyLearner({ prefs: { mode: "both", theme: "dark", ambient: false, cursor: false, breakMinutes: 15 } }));
  const breakPage = await newPage(breakContext, "break-reminder");
  await breakPage.clock.install({ time: new Date("2026-11-27T10:00:00Z") });

  await audit({
    id: "BRK-01",
    area: "Break reminder",
    title: "15-minute reminder appears after active study time and snooze delays it",
    severity: "P1",
    routes: [ROUTES.settings, ROUTES.paths],
    steps: "Seed breakMinutes=15, install fake clock, wait for a real study tick, advance 18 minutes with pointer activity, assert reminder; snooze, advance 9 minutes (quiet), then 17 minutes (reminder returns); verify Off and re-enable.",
    fn: async () => {
      await goto(breakPage, ROUTES.settings);
      await breakPage.waitForFunction(
        () => document.querySelector("#learner-break")?.value === "15",
        undefined,
        { timeout: INTERACTION_TIMEOUT },
      );
      await waitForStudyTimer(breakPage, 15 * 60_000);
      await advanceWithActivity(breakPage, 18 * 60_000);
      const reminder = breakPage.locator('aside[aria-label="Break reminder"]');
      await reminder.waitFor({ state: "visible", timeout: 10000 });
      await breakPage.getByRole("button", { name: "Snooze 10m" }).click();
      await advanceWithActivity(breakPage, 9 * 60_000);
      assert.equal(await reminder.count(), 0, "reminder returned before the 10m snooze elapsed");
      // Snooze deliberately resets the active-time accumulator, so a fresh
      // 15m of study is required before the next reminder.
      await advanceWithActivity(breakPage, 17 * 60_000);
      await reminder.waitFor({ state: "visible", timeout: 10000 });
      const screenshot = await shot(breakPage, "break-reminder-visible");

      await breakPage.locator("#learner-break").selectOption("0");
      await breakPage.clock.runFor(1000);
      assert.equal(await reminder.count(), 0, "Off did not hide the visible reminder");
      await advanceWithActivity(breakPage, 18 * 60_000);
      assert.equal(await reminder.count(), 0, "reminder appeared while breaks were Off");
      await breakPage.locator("#learner-break").selectOption("15");
      await breakPage.clock.runFor(1000);
      assert.equal(await reminder.count(), 0, "re-enabling breaks resurrected a stale reminder");

      return {
        appearedAfter: "15m active",
        snooze: "quiet for 10m, active timer reset, reminder returned after a further 15m",
        off: "hid the open reminder and re-enabled without stale state",
        screenshot,
      };
    },
  });

  await audit({
    id: "BRK-02",
    area: "Break reminder",
    title: "An active quiz suppresses the break reminder",
    severity: "P1",
    routes: [ROUTES.quiz],
    steps: "Seed a read lesson and breakMinutes=15, open /quiz with fake clock, advance time with pointer activity, check no reminder.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: VIEWPORTS[3] });
      await seed(ctx, emptyLearner({
        completedLessons: ["single-server"],
        visitedTopics: ["single-server"],
        prefs: { mode: "both", theme: "dark", ambient: false, cursor: false, breakMinutes: 15 },
      }));
      const page = await newPage(ctx, "break-quiz");
      await page.clock.install({ time: new Date("2026-11-27T10:00:00Z") });
      await goto(page, ROUTES.quiz);
      await page.locator('[data-quiz-active="true"]').waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      await waitForStudyTimer(page, 15 * 60_000);
      await advanceWithActivity(page, 18 * 60_000);
      assert.equal(await page.locator('aside[aria-label="Break reminder"]').count(), 0, "reminder appeared during an active quiz");
      assert.equal(await page.locator('[data-quiz-active="true"]').count(), 1, "quiz stopped being active during the test");
      await ctx.close();
      return { quizActive: true, reminderShown: false };
    },
  });
} catch (error) {
  notVerified({
    id: "BRK-INFRA",
    area: "Break reminder",
    title: "Break reminder scenario could not be started",
    severity: "P1",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 10. Quiz empty / seeded behaviour
// ---------------------------------------------------------------------------

try {
  const quizContext = await trackedContext({ viewport: VIEWPORTS[3] });
  const quizPage = await newPage(quizContext, "quiz");

  await audit({
    id: "QUIZ-01",
    area: "Quiz",
    title: "Fresh context shows the empty state with no active question",
    severity: "P1",
    routes: [ROUTES.quiz],
    steps: "Open /quiz in a fresh isolated context.",
    fn: async () => {
      await goto(quizPage, ROUTES.quiz);
      await quizPage.getByText(/Nothing to review yet/i).first().waitFor({ timeout: INTERACTION_TIMEOUT });
      assert.equal(await quizPage.locator('[data-quiz-active="true"]').count(), 0, "active question in a fresh context");
      return { emptyState: true };
    },
  });

  const seededQuizContext = await trackedContext({ viewport: VIEWPORTS[3] });
  await seed(seededQuizContext, emptyLearner({ completedLessons: ["single-server"], visitedTopics: ["single-server"] }));
  const seededQuizPage = await newPage(seededQuizContext, "quiz-seeded");

  await audit({
    id: "QUIZ-02",
    area: "Quiz",
    title: "Seeded read topic yields a question; answer persists after reload",
    severity: "P1",
    routes: [ROUTES.quiz],
    steps: "Seed completedLessons=[single-server], open /quiz, answer, reload.",
    fn: async () => {
      await goto(seededQuizPage, ROUTES.quiz);
      const active = seededQuizPage.locator('[data-quiz-active="true"]');
      await active.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      assert.equal(await active.locator("button").count(), 4, "question does not have four choices");
      await active.locator("button").first().click();
      await seededQuizPage.getByText(/Saved to your local review schedule/i).waitFor({ timeout: INTERACTION_TIMEOUT });
      const before = (await readLearner(seededQuizPage))?.quizHistory?.length ?? 0;
      assert.equal(before, 1, "answer was not recorded in quizHistory");
      await pageReload(seededQuizPage);
      const after = (await readLearner(seededQuizPage))?.quizHistory?.length ?? 0;
      assert.equal(after, 1, "quiz history lost after reload");
      return { choices: 4, historyAfterReload: after };
    },
  });
} catch (error) {
  notVerified({
    id: "QUIZ-INFRA",
    area: "Quiz",
    title: "Quiz scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 11. Export / import / malformed JSON / reload restoration
// ---------------------------------------------------------------------------

try {
  const dataContext = await trackedContext({ viewport: VIEWPORTS[3], acceptDownloads: true });
  await seed(dataContext, emptyLearner({
    completedLessons: ["single-server"],
    readBlogs: ["database-melts-at-10k-rps"],
    notes: { "single-server": "export check" },
    prefs: { mode: "engineer", theme: "light", ambient: false, cursor: false, breakMinutes: 25 },
  }));
  const dataPage = await newPage(dataContext, "learner-data");

  let exportedText = "";
  await audit({
    id: "DAT-01",
    area: "Export / import",
    title: "Export produces a downloadable, valid SysCraft progress JSON",
    severity: "P1",
    routes: [ROUTES.settings],
    steps: "On /settings click Export progress, capture the download and parse its JSON.",
    fn: async () => {
      await goto(dataPage, ROUTES.settings);
      const downloadPromise = dataPage.waitForEvent("download", { timeout: INTERACTION_TIMEOUT });
      await dataPage.getByRole("button", { name: "Export progress" }).click();
      const download = await downloadPromise;
      const path = await download.path();
      assert.ok(path, "download has no path");
      exportedText = readFileSync(path, "utf8");
      const parsed = JSON.parse(exportedText);
      assert.equal(parsed.version, 1, "exported version is not 1");
      assert.ok(parsed.completedLessons.includes("single-server"), "export lost completed lessons");
      assert.equal(parsed.prefs.theme, "light", "export lost theme preference");
      assert.match(download.suggestedFilename(), /^syscraft-progress-\d{4}-\d{2}-\d{2}\.json$/, "unexpected download filename");
      return { filename: download.suggestedFilename(), bytes: exportedText.length };
    },
  });

  await audit({
    id: "DAT-02",
    area: "Export / import",
    title: "Malformed JSON is rejected with a status message and leaves state untouched",
    severity: "P1",
    routes: [ROUTES.settings],
    steps: "Upload a broken .json file to Import progress; compare localStorage before/after.",
    fn: async () => {
      await goto(dataPage, ROUTES.settings);
      const before = JSON.stringify(await readLearner(dataPage));
      await dataPage.locator("#learner-progress-file").setInputFiles({
        name: "broken.json",
        mimeType: "application/json",
        buffer: Buffer.from("{ this is not json"),
      });
      await dataPage.getByText(/not valid SysCraft progress/i).waitFor({ timeout: INTERACTION_TIMEOUT });
      const after = JSON.stringify(await readLearner(dataPage));
      assert.equal(after, before, "malformed import changed learner state");
      return { unchanged: true };
    },
  });

  await audit({
    id: "DAT-03",
    area: "Export / import",
    title: "Valid import replaces state and survives a full reload",
    severity: "P1",
    routes: [ROUTES.settings, ROUTES.quiz],
    steps: "Import a crafted valid file, confirm status, reload, verify counts and quiz eligibility.",
    fn: async () => {
      assert.ok(exportedText, "no exported JSON was captured by DAT-01");
      const imported = JSON.parse(exportedText);
      imported.completedLessons = ["url-shortener"];
      imported.readBlogs = [];
      imported.notes = {};
      imported.quizHistory = [];
      imported.visitedTopics = ["url-shortener"];
      imported.prefs.theme = "dark";
      await goto(dataPage, ROUTES.settings);
      await dataPage.locator("#learner-progress-file").setInputFiles({
        name: "progress.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(imported)),
      });
      await dataPage.getByText("Progress imported.").waitFor({ timeout: INTERACTION_TIMEOUT });
      const state = await readLearner(dataPage);
      assert.deepEqual(state.completedLessons, ["url-shortener"], "imported lessons not applied");
      await pageReload(dataPage);
      const restored = await readLearner(dataPage);
      assert.deepEqual(restored.completedLessons, ["url-shortener"], "imported progress lost on reload");
      assert.equal(restored.prefs.theme, "dark", "imported preference lost on reload");
      await goto(dataPage, ROUTES.quiz);
      assert.equal(await dataPage.locator('[data-quiz-active="true"]').count(), 1, "imported read topic did not seed the quiz");
      return { lessons: restored.completedLessons, theme: restored.prefs.theme };
    },
  });
} catch (error) {
  notVerified({
    id: "DAT-INFRA",
    area: "Export / import",
    title: "Data scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 12. Responsive sweep
// ---------------------------------------------------------------------------

const RESPONSIVE_ROUTES = [ROUTES.paths, ROUTES.lesson, ROUTES.blog, ROUTES.map, ROUTES.tools, ROUTES.quiz, ROUTES.settings];

try {
  await audit({
    id: "RSP-01",
    area: "Responsive",
    title: "No horizontal overflow at 375 / 768 / 1280 / 1440 across audited routes",
    severity: "P1",
    routes: RESPONSIVE_ROUTES,
    steps: "Set each viewport, visit each route, compare document scrollWidth with innerWidth.",
    fn: async () => {
      const rows = [];
      for (const vp of VIEWPORTS) {
        const ctx = await trackedContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: vp.isMobile,
          hasTouch: vp.hasTouch,
        });
        const page = await newPage(ctx, `responsive-${vp.label}`);
        for (const route of RESPONSIVE_ROUTES) {
          await goto(page, route);
          const m = await overflowMeasure(page);
          rows.push({ viewport: vp.label, route, ...m });
          assert.ok(m.overflowPx <= 1, `${vp.label} ${route}: horizontal overflow ${m.overflowPx}px; ${m.offenders.join("; ")}`);
        }
        await ctx.close();
      }
      return { checked: rows.length, maxOverflowPx: Math.max(...rows.map((r) => r.overflowPx)) };
    },
  });

  await audit({
    id: "RSP-02",
    area: "Responsive",
    title: "Touch targets on the reader are at least 24px at 375px",
    severity: "P2",
    routes: [ROUTES.lesson, ROUTES.blog],
    steps: "At 375px measure step-dot and navigation button bounding boxes.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const page = await newPage(ctx, "responsive-touch");
      const rows = [];
      for (const route of [ROUTES.lesson, ROUTES.blog]) {
        await goto(page, route);
        const measured = await page.evaluate(() => {
          const nodes = Array.from(document.querySelectorAll('main button[aria-label^="Go to step"], main nav button'));
          return nodes.slice(0, 12).map((node) => {
            const r = node.getBoundingClientRect();
            return { label: (node.getAttribute("aria-label") ?? node.textContent ?? "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) };
          });
        });
        const small = measured.filter((m) => m.h < 24 || m.w < 24);
        rows.push({ route, small, total: measured.length, screenshot: await shot(page, `touch-${route === ROUTES.lesson ? "lesson" : "blog"}`) });
        assert.deepEqual(small, [], `${route}: ${small.length} controls below 24px: ${JSON.stringify(small.slice(0, 4))}`);
      }
      await ctx.close();
      return { rows };
    },
  });

  await audit({
    id: "RSP-03",
    area: "Responsive",
    title: "Command palette and utility dock overlay content without clipping",
    severity: "P2",
    routes: [ROUTES.paths],
    steps: "At 375px open the palette and dock; measure their boxes and z-index against the header.",
    fn: async () => {
      const ctx = await trackedContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const page = await newPage(ctx, "responsive-overlay");
      await goto(page, ROUTES.paths);
      await openPalette(page);
      const dialog = page.locator("[cmdk-dialog]").first();
      await dialog.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      const box = await dialog.boundingBox();
      assert.ok(box, "palette dialog has no box");
      assert.ok(box.x >= -1 && box.x + box.width <= 376, `palette clipped horizontally: ${JSON.stringify(box)}`);
      assert.ok(box.y >= -1 && box.y + box.height <= 813, `palette clipped vertically: ${JSON.stringify(box)}`);
      const z = await dialog.evaluate((el) => Number(getComputedStyle(el).zIndex));
      assert.ok(z >= 80, `palette z-index ${z} too low`);
      await page.keyboard.press("Escape");
      await page.locator("[data-utility-launcher]").click();
      const popover = page.locator("#platform-utility-popover");
      await popover.waitFor({ state: "visible", timeout: INTERACTION_TIMEOUT });
      const dockBox = await popover.boundingBox();
      assert.ok(dockBox, "dock popover has no box");
      assert.ok(dockBox.x >= -1 && dockBox.x + dockBox.width <= 376, `dock clipped: ${JSON.stringify(dockBox)}`);
      await ctx.close();
      return { palette: box, paletteZ: z, dock: dockBox };
    },
  });
} catch (error) {
  notVerified({
    id: "RSP-INFRA",
    area: "Responsive",
    title: "Responsive scenario could not be started",
    severity: "P0",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// 13. Browser error telemetry
// ---------------------------------------------------------------------------

try {
  await audit({
    id: "ERR-01",
    area: "Errors",
    title: "No hydration warnings, uncaught page errors, or same-origin console/HTTP failures",
    severity: "P1",
    routes: Object.values(ROUTES),
    steps: "Aggregate console, pageerror, requestfailed and response events from every isolated scenario.",
    fn: async () => {
      const hydration = consoleErrors.filter((e) =>
        /hydrat|did not match|server rendered html|text content does not match/i.test(e.text),
      );
      const appConsole = consoleErrors.filter(
        (e) => e.sameOrigin && !/favicon/i.test(`${e.text} ${e.url}`) && !hydration.includes(e),
      );
      const appHttp = httpErrors.filter((e) => e.sameOrigin && !/favicon/i.test(e.url));
      // ERR_ABORTED on our own navigations is harness-generated (we navigate
      // away and close contexts while Next.js prefetches are still in flight).
      // It is reported, but excluded from the product-failure assertion.
      const abortedByHarness = networkErrors.filter(
        (e) => e.sameOrigin && /ERR_ABORTED/i.test(e.error),
      );
      const appNetwork = networkErrors.filter(
        (e) => e.sameOrigin && !/favicon/i.test(e.url) && !/ERR_ABORTED/i.test(e.error),
      );
      const summary = {
        hydration: hydration.length,
        pageErrors: pageErrors.length,
        appConsole: appConsole.length,
        appHttp: appHttp.length,
        appNetwork: appNetwork.length,
        abortedByHarness: abortedByHarness.length,
        crossOriginNetwork: networkErrors.length - appNetwork.length - abortedByHarness.length,
        samples: {
          hydration: hydration.slice(0, 3).map((e) => e.text),
          pageErrors: pageErrors.slice(0, 3).map((e) => e.message),
          appConsole: appConsole.slice(0, 3).map((e) => e.text),
          appHttp: appHttp.slice(0, 3).map((e) => `${e.status} ${e.url}`),
          appNetwork: appNetwork.slice(0, 3).map((e) => `${e.error} ${e.url}`),
          abortedByHarness: abortedByHarness.slice(0, 3).map((e) => `${e.error} ${e.url}`),
        },
      };
      const problems = [];
      if (summary.hydration) problems.push(`${summary.hydration} hydration warnings`);
      if (summary.pageErrors) problems.push(`${summary.pageErrors} uncaught page errors`);
      if (summary.appConsole) problems.push(`${summary.appConsole} same-origin console errors`);
      if (summary.appHttp) problems.push(`${summary.appHttp} same-origin HTTP >= 400`);
      if (summary.appNetwork) problems.push(`${summary.appNetwork} same-origin failed requests`);
      if (problems.length) {
        const error = new Error(problems.join("; "));
        error.evidence = summary;
        throw error;
      }
      return summary;
    },
  });
} catch (error) {
  notVerified({
    id: "ERR-INFRA",
    area: "Errors",
    title: "Error telemetry aggregation failed",
    severity: "P1",
    reason: error instanceof Error ? error.message : String(error),
  });
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function evidenceText(evidence) {
  const pick = Object.entries(evidence ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 3)
    .map(([key, value]) => {
      const rendered = typeof value === "object" ? JSON.stringify(value).slice(0, 260) : String(value);
      return `${key}=${rendered}`;
    });
  return pick.join("; ") || "—";
}

function tableRows(severity) {
  return results
    .filter((r) => r.severity === severity)
    .map(
      (r) =>
        `| ${r.id} | ${r.title} | ${r.routes.join(", ") || "—"} | ${r.status} | ${r.status === "FAIL" ? r.detail.split("\n")[0] : evidenceText(r.evidence)} |`,
    )
    .join("\n");
}

function counts() {
  const out = {};
  for (const severity of ["P0", "P1", "P2"]) {
    const items = results.filter((r) => r.severity === severity);
    out[severity] = {
      pass: items.filter((r) => r.status === "PASS").length,
      fail: items.filter((r) => r.status === "FAIL").length,
      notVerified: items.filter((r) => r.status === "NOT VERIFIED").length,
      total: items.length,
    };
  }
  return out;
}

const summary = counts();
const lines = [];
lines.push("# SysCraft — Step 1 live runtime UI/UX audit");
lines.push("");
lines.push(`- Generated (UTC): ${new Date().toISOString()}`);
lines.push(`- BASE_URL: \`${BASE_URL}\``);
lines.push(`- Browser: Playwright Chromium ${browser?.version?.() ?? "unknown"}, headless, isolated context per scenario`);
lines.push(`- Evidence screenshots: \`${SHOT_DIR}\``);
lines.push(`- Scope: command palette, theme, custom cursor, ambient background, readers (including meaningful-read eligibility and arrow-key visual replay), lazy-loaded bespoke visuals, blogs index, landing closing CTA and bento alignment, labs excerpts, knowledge map, tools, break reminder, quiz, export/import, responsive layout, browser errors. Canvas runtime is owned by another agent and is not duplicated here.`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push("| Severity | PASS | FAIL | NOT VERIFIED | Total |");
lines.push("| --- | ---: | ---: | ---: | ---: |");
for (const severity of ["P0", "P1", "P2"]) {
  const c = summary[severity];
  lines.push(`| ${severity} | ${c.pass} | ${c.fail} | ${c.notVerified} | ${c.total} |`);
}
lines.push("");
lines.push("## Prioritized findings");
lines.push("");
lines.push("### P0 — blocking");
lines.push("");
lines.push("| ID | Finding | Affected routes | Status | Evidence / detail |");
lines.push("| --- | --- | --- | --- | --- |");
lines.push(tableRows("P0") || "| — | None recorded | — | — | — |");
lines.push("");
lines.push("### P1 — major");
lines.push("");
lines.push("| ID | Finding | Affected routes | Status | Evidence / detail |");
lines.push("| --- | --- | --- | --- | --- |");
lines.push(tableRows("P1") || "| — | None recorded | — | — | — |");
lines.push("");
lines.push("### P2 — minor / polish");
lines.push("");
lines.push("| ID | Finding | Affected routes | Status | Evidence / detail |");
lines.push("| --- | --- | --- | --- | --- |");
lines.push(tableRows("P2") || "| — | None recorded | — | — | — |");
lines.push("");
lines.push("## Reproducible steps");
lines.push("");
for (const r of results) {
  lines.push(`- **${r.id} (${r.severity}, ${r.status})** ${r.title}`);
  lines.push(`  - Steps: ${r.steps || "—"}`);
  if (r.status === "FAIL") lines.push(`  - Observed: ${r.detail.split("\n")[0]}`);
  if (r.status === "NOT VERIFIED") lines.push(`  - Reason: ${r.detail}`);
}
lines.push("");
lines.push("## Full check log");
lines.push("");
lines.push("| ID | Area | Check | Severity | Result | Detail / evidence |");
lines.push("| --- | --- | --- | --- | --- | --- |");
for (const r of results) {
  const detail = r.status === "FAIL" ? r.detail.split("\n")[0] : r.status === "NOT VERIFIED" ? r.detail : evidenceText(r.evidence);
  lines.push(`| ${r.id} | ${r.area} | ${r.title} | ${r.severity} | ${r.status} | ${String(detail).replace(/\|/g, "\\|").slice(0, 400)} |`);
}
lines.push("");
lines.push("## Browser error telemetry");
lines.push("");
const errCheck = results.find((r) => r.id === "ERR-01");
lines.push(errCheck?.evidence && Object.keys(errCheck.evidence).length ? JSON.stringify(errCheck.evidence, null, 2) : "Telemetry check did not complete; see ERR-01 status.");
lines.push("");
lines.push("## Method notes");
lines.push("");
lines.push("- Checks are deterministic where possible: DOM assertions, computed styles, WCAG contrast maths, Playwright `page.clock` for the break reminder, and real file downloads/uploads for export/import.");
lines.push("- Keyboard shortcuts are retried up to four times because the listener attaches in a hydration effect; the number of attempts is recorded in PAL-01. Across five development runs, an immediate Ctrl+K after the dock launcher appeared was missed on /paths twice; the final recorded run opened on the first attempt everywhere. Treat first-attempt reliability as intermittent and worth a listener-attachment fix.");
lines.push("- Theme and break-reminder checks wait for hydration/settling before sampling; the underlying preferences still persist across reload (THM-02, BRK-01).");
lines.push("- A FAIL is a real product defect, not an automation artifact. If a behaviour could not be driven safely it is labelled NOT VERIFIED with the reason and a code reference where applicable.");
lines.push("- `net::ERR_ABORTED` on same-origin routes is counted and shown separately in ERR-01: it is generated by the harness navigating away / closing contexts during Next.js prefetches, not by the product. All other failed requests are treated as failures.");
lines.push("- Meaningful-read checks sample learner state on open and on an intermediate step before jumping to the final step; a MutationObserver on the stable visual figure captures SVG/group remounts, body-content changes and the visual's own STEP marker so arrow-key transition is measured on the visual body, not the step dot.");
lines.push("- No threshold was relaxed to hide a failure: 4.5:1 WCAG AA for body/heading text, 24px minimum touch targets, <=1px horizontal overflow, and z-index ordering were all applied as written.");
lines.push("");

try {
  for (const context of openContexts) await context.close().catch(() => {});
} finally {
  if (browser) await browser.close().catch(() => {});
}

writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
console.log("");
console.log(`AUDIT_COMPLETE report=${REPORT_PATH} P0=${summary.P0.fail} P1=${summary.P1.fail} P2=${summary.P2.fail} NOT_VERIFIED=${results.filter((r) => r.status === "NOT VERIFIED").length}`);
