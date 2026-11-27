/**
 * SysCraft production QA + honest weighted scoring.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:4173 node scripts/qa-production.mjs
 *
 * The script is intentionally self-contained: it uses only `playwright`,
 * `node:assert` and `node:fs`. It opens an isolated browser context per
 * scenario so localStorage state can never leak between checks. Every check is
 * labelled CRITICAL or non-critical. A critical failure sets a nonzero exit
 * code; a non-critical failure only lowers the score.
 *
 * If the UI team renames a control, update the SELECTORS / ROUTES tables near
 * the top of this file. Checks never silently skip: a missing critical control
 * is reported as a FAIL with a named selector constant.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

// ---------------------------------------------------------------------------
// Configuration (easy to update when the UI changes)
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.BASE_URL ?? "http://127.0.0.1:4173").replace(/\/+$/, "");
const SCORECARD_PATH = resolve(process.cwd(), "docs", "qa-scorecard.md");
const VIEWPORT_DESKTOP = { width: 1440, height: 900 };
const VIEWPORT_MOBILE = { width: 390, height: 844 };

const CATEGORIES = [
  { key: "routes", label: "Routes and content", weight: 20 },
  { key: "learning", label: "Core learning interactions", weight: 20 },
  { key: "landing", label: "Landing and interactive motion", weight: 15 },
  { key: "dock", label: "Compact dock and preferences", weight: 10 },
  { key: "quiz", label: "Quiz and local persistence", weight: 15 },
  { key: "tools", label: "Tools, map, and labs", weight: 10 },
  { key: "a11y", label: "Responsiveness, reduced motion, accessibility", weight: 10 },
];

/** Track slugs and a representative first lesson for each of the 7 paths. */
const TRACKS = [
  { slug: "foundations", firstLesson: "single-server" },
  { slug: "distributed", firstLesson: "replication-consistency" },
  { slug: "case-studies", firstLesson: "url-shortener" },
  { slug: "ai-engineering", firstLesson: "tokenization" },
  { slug: "llm-inference", firstLesson: "transformer-bottlenecks" },
  { slug: "ml-math", firstLesson: "linear-algebra" },
  { slug: "backend-cloud", firstLesson: "concurrency-event-loops" },
];

const ROUTES = [
  "/",
  "/paths",
  ...TRACKS.map((t) => `/paths/${t.slug}`),
  ...TRACKS.map((t) => `/paths/${t.slug}/${t.firstLesson}`),
  "/blogs",
  "/blogs/database-melts-at-10k-rps",
  "/labs",
  "/labs/bitly-url-shortener",
  "/map",
  "/tools",
  "/quiz",
  "/settings",
  "/privacy",
];

/**
 * Named selectors. Prefer accessible names and roles; these are the few places
 * where a stable data attribute or heading id is used. Update here, not inline.
 */
const SELECTORS = {
  // Verified in HeroMiniCanvas.tsx: the new model describes a request → response
  // lifecycle. Keep the legacy label as a fallback so the check survives a
  // partial rollout, but do not depend on path colours or other internals.
  heroModel:
    'svg[role="img"][aria-label*="client request travels" i], svg[role="img"][aria-label*="moving request packets" i]',
  heroSpike: { role: "button", name: "Spike traffic 3×" },
  heroKill: { role: "button", name: "Kill an API node" },
  heroAttack: { role: "button", name: "Simulate attack" },
  readingMode: { role: "group", name: "Reading mode" },
  // Both mode: one animated Story/Engineer tab group per step.
  readingLayer: { role: "group", name: /^Reading layer for / },
  // Story mode: on-demand engineer disclosure instead of a second text wall.
  engineerDisclosure: /Go deeper · Engineer|Hide engineering details/,
  stepControls: { role: "navigation", name: "Step controls" },
  activeStep: '[aria-current="step"]',
  stepDot: /^Go to step \d+:/,
  lessonNotes: { label: "Notes for this lesson" },
  bookmark: { role: "button", name: /^Bookmark(ed)?$/ },
  shield: { role: "button", name: /^(Show the shield|Shield on)$/ },
  searchFieldNotes: { label: "Search field notes" },
  // Verified in UtilityDock.tsx: the launcher carries the stable
  // `data-utility-launcher` attribute; its accessible label flips between
  // `Open platform utilities` and `Close platform utilities` on toggle. Prefer
  // the stable attribute so a returned locator keeps matching after opening.
  dockLauncher: [
    "button[data-utility-launcher]",
    'button[aria-label="Open platform utilities"], button[aria-label="Close platform utilities"]',
    'button[aria-label="Open learning tools"], button[aria-label="Close learning tools"]',
    'button[aria-label*="utilities" i]',
    'button[aria-label*="utility" i]',
    'button[aria-label*="dock" i]',
    'button[aria-label*="launcher" i]',
    'button[aria-controls*="dock" i]',
    'button[aria-controls*="utility" i]',
    "[data-dock-launcher]",
    "#utility-launcher",
  ],
  dockPanel: [
    "#platform-utility-popover",
    '[role="dialog"][aria-label="Platform utilities"]',
    "[data-dock-panel]",
    '[role="region"][aria-label="Scratchpad"]',
    '[role="region"][aria-label="Bookmarks"]',
    'section[aria-label="Scratchpad"]',
    'section[aria-label="Bookmarks"]',
  ].join(", "),
  dockSearch: [
    { role: "button", name: /Search lessons, labs, and tools/i },
    { role: "textbox", name: /Search lessons, labs, and tools/i },
  ],
  dockNotes: [
    { role: "button", name: /Scratchpad notes/i },
    { role: "button", name: /^(Notes|Scratchpad)$/ },
    { role: "button", name: /^Open notes/i },
  ],
  dockBookmarks: [
    { role: "button", name: /Saved bookmarks/i },
    { role: "button", name: /^(Bookmarks|Saved)$/ },
    { role: "button", name: /^Open bookmarks/i },
  ],
  dockMode: [{ role: "group", name: /Learning mode|Reading mode/i }],
  dockAmbient: [{ role: "button", name: /Ambient background/i }],
  dockCursor: [{ role: "button", name: /Custom cursor/i }],
  dockBreak: [{ label: /Break reminder interval/i }],
  quizActive: '[data-quiz-active="true"]',
  quizEmpty: /Nothing to review yet/i,
  capacityRegion: { role: "region", name: "Capacity estimate" },
  kvRegion: { role: "region", name: "KV cache and VRAM" },
  slaRegion: { role: "region", name: "Error budget" },
  notationRegion: { role: "region", name: "Notation decoder" },
  notationSearch: { label: "Search notation" },
  securityRegion: { role: "region", name: "Security checklist" },
  mapSearch: { placeholder: "Find a track or lesson" },
  labStart: /start the lab|open the canvas|re-open the lab canvas|jump back in/i,
  exportButton: { role: "button", name: "Export progress" },
  importInput: { label: "Import progress" },
  cursorMode: "[data-cursor-mode]",
};

const LEARNER_KEY = "syscraft.learner.v1";

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
// Runner: results, error collection, scoring
// ---------------------------------------------------------------------------

const checks = [];
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const httpErrors = [];
let frameTiming = null;
let browser;

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
      line: location.lineNumber ?? "",
      sameOrigin: sameOrigin(location.url),
    });
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ label, message: error.message, stack: (error.stack ?? "").slice(0, 400) });
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    networkErrors.push({
      label,
      url,
      error: request.failure()?.errorText ?? "request failed",
      sameOrigin: sameOrigin(url),
    });
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    httpErrors.push({ label, url, status: response.status(), sameOrigin: sameOrigin(url) });
  });
}

async function check(category, name, critical, fn) {
  try {
    await fn();
    checks.push({ category, name, critical, passed: true, detail: "" });
    console.log(`PASS  ${category} — ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ category, name, critical, passed: false, detail });
    console.log(`FAIL  ${category} — ${name}${critical ? " [CRITICAL]" : ""}`);
    console.log(`      ${detail.split("\n")[0]}`);
  }
}

async function newPage(context, label) {
  const page = await context.newPage();
  watchPage(page, label);
  return page;
}

async function seed(context, state) {
  await context.addInitScript(
    ({ key, value }) => {
      try {
        // addInitScript runs on EVERY navigation. Seed once only, otherwise a
        // reload would overwrite answers/history written by the app itself.
        if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
      } catch {
        /* storage denial is handled by the app */
      }
    },
    { key: LEARNER_KEY, value: JSON.stringify(state) },
  );
}

async function readLearner(page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, LEARNER_KEY);
}

async function regionText(page, locator) {
  await locator.waitFor({ state: "visible", timeout: 8000 });
  return (await locator.innerText()).replace(/\s+/g, " ");
}

async function activeStepNumber(page) {
  const current = page.locator(SELECTORS.activeStep).first();
  await current.waitFor({ state: "visible", timeout: 8000 });
  const label = (await current.getAttribute("aria-label")) ?? "";
  const match = label.match(/step\s+(\d+)/i);
  if (!match) throw new Error(`Cannot read active step from aria-label "${label}"`);
  return Number(match[1]);
}

async function findLauncher(page) {
  // SELECTORS.dockLauncher is ordered with the stable data attribute first so
  // the returned locator keeps matching when the label becomes "Close ...".
  for (const selector of SELECTORS.dockLauncher) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) return locator;
  }
  return null;
}

async function isDockOpen(page, launcher) {
  // When a launcher exists its aria-expanded is the source of truth: the
  // AnimatePresence panel can stay visible for a few frames while it exits.
  if (launcher) return (await launcher.getAttribute("aria-expanded")) === "true";
  const panels = page.locator(SELECTORS.dockPanel);
  const count = await panels.count();
  for (let i = 0; i < count; i += 1) {
    if (await panels.nth(i).isVisible()) return true;
  }
  return false;
}

async function visibleAny(page, specs) {
  // These are alternatives: one visible control satisfies the whole group.
  for (const spec of specs) {
    const locator = "role" in spec ? page.getByRole(spec.role, { name: spec.name }) : page.getByLabel(spec.label);
    const count = await locator.count();
    for (let i = 0; i < count; i += 1) {
      if (await locator.nth(i).isVisible()) return [];
    }
  }
  return specs.map((spec) => JSON.stringify(spec));
}

function calculateScore() {
  const summary = [];
  let total = 0;
  for (const category of CATEGORIES) {
    const items = checks.filter((item) => item.category === category.key);
    const passed = items.filter((item) => item.passed).length;
    const earned = items.length === 0 ? category.weight : (passed / items.length) * category.weight;
    total += earned;
    summary.push({ ...category, passed, total: items.length, earned: Math.round(earned * 10) / 10 });
  }
  return { total: Math.round(total), summary };
}

function errorSummary() {
  const hydration = consoleErrors.filter((e) =>
    /hydrat|did not match|server rendered html|text content does not match/i.test(e.text),
  );
  const appConsole = consoleErrors.filter(
    (e) => e.sameOrigin && !/favicon/i.test(`${e.text} ${e.url}`) && !hydration.includes(e),
  );
  const appHttp = httpErrors.filter((e) => e.sameOrigin && !/favicon/i.test(e.url));
  return { hydration, appConsole, appHttp };
}

function writeScorecard(score) {
  const failures = checks.filter((item) => !item.passed);
  const errors = errorSummary();
  const lines = [];
  lines.push("# SysCraft production QA scorecard");
  lines.push("");
  lines.push(`- Generated (UTC): ${new Date().toISOString()}`);
  lines.push(`- BASE_URL: \`${BASE_URL}\``);
  lines.push(`- Overall score: **${score.total} / 100**`);
  lines.push(`- Checks: ${checks.length - failures.length}/${checks.length} passed (${failures.length} failed)`);
  lines.push(
    `- Critical failures: ${failures.filter((f) => f.critical).length} — run exit status: ${
      failures.some((f) => f.critical) ? "FAIL (nonzero)" : "PASS"
    }`,
  );
  lines.push("");
  lines.push("## Category scores");
  lines.push("");
  lines.push("| Category | Weight | Passed | Score |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const row of score.summary) {
    lines.push(`| ${row.label} | ${row.weight} | ${row.passed}/${row.total} | ${row.earned} |`);
  }
  lines.push("");
  lines.push("## Frame timing");
  lines.push("");
  if (frameTiming) {
    lines.push(`- Steady-state 90 rAF frames after fonts and entrance reveals have settled: average **${frameTiming.average.toFixed(2)} ms**, p95 **${frameTiming.p95.toFixed(2)} ms**.`);
    lines.push("- Thresholds: average <= 34 ms, p95 <= 50 ms (headless vsync is not treated as a hard failure).");
  } else {
    lines.push("- Not measured (landing motion check did not complete).");
  }
  lines.push("");
  lines.push("## Failures");
  lines.push("");
  if (failures.length === 0) {
    lines.push("- None.");
  } else {
    for (const failure of failures) {
      lines.push(`- **${failure.critical ? "CRITICAL" : "NON-CRITICAL"}** ${failure.category} — ${failure.name}`);
      lines.push(`  - ${failure.detail.split("\n")[0]}`);
    }
  }
  lines.push("");
  lines.push("## Browser error telemetry");
  lines.push("");
  lines.push(`- Console errors (same-origin): ${errors.appConsole.length}`);
  lines.push(`- Hydration warnings: ${errors.hydration.length}`);
  lines.push(`- Uncaught page errors: ${pageErrors.length}`);
  lines.push(`- HTTP >= 400 (same-origin): ${errors.appHttp.length}`);
  lines.push(`- Failed requests (all origins): ${networkErrors.length}`);
  if (errors.appConsole.length) {
    lines.push(`  - sample: ${errors.appConsole.slice(0, 3).map((e) => e.text).join(" | ")}`);
  }
  if (errors.hydration.length) {
    lines.push(`  - sample: ${errors.hydration.slice(0, 3).map((e) => e.text).join(" | ")}`);
  }
  if (pageErrors.length) {
    lines.push(`  - sample: ${pageErrors.slice(0, 3).map((e) => e.message).join(" | ")}`);
  }
  if (errors.appHttp.length) {
    lines.push(`  - sample: ${errors.appHttp.slice(0, 3).map((e) => `${e.status} ${e.url}`).join(" | ")}`);
  }
  lines.push("");
  lines.push("## Check log");
  lines.push("");
  lines.push("| Category | Check | Critical | Result |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of checks) {
    lines.push(
      `| ${item.category} | ${item.name} | ${item.critical ? "yes" : "no"} | ${
        item.passed ? "PASS" : "FAIL"
      } |`,
    );
  }
  lines.push("");
  writeFileSync(SCORECARD_PATH, `${lines.join("\n")}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

try {
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const page = await newPage(desktop, "desktop");

  // -- 1. Routes and content -------------------------------------------------
  await check("routes", "all required routes render without HTTP 404 or empty body", true, async () => {
    const visited = [];
    for (const path of ROUTES) {
      const url = `${BASE_URL}${path}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      assert.ok(response, `No navigation response for ${path}`);
      assert.ok(response.status() < 400, `HTTP ${response.status()} for ${path}`);
      const body = (await page.locator("body").innerText()).trim();
      assert.ok(body.length > 40, `${path} rendered an empty/near-empty body (${body.length} chars)`);
      visited.push(path);
    }
    assert.equal(visited.length, ROUTES.length);
  });

  await check("routes", "no console, hydration, page, or same-origin network errors across routes", true, async () => {
    const errors = errorSummary();
    assert.deepEqual(
      errors.hydration.map((e) => e.text),
      [],
      "hydration mismatch warnings detected",
    );
    assert.deepEqual(
      pageErrors.map((e) => e.message),
      [],
      "uncaught page errors detected",
    );
    assert.deepEqual(
      errors.appConsole.map((e) => `${e.label}: ${e.text}`),
      [],
      "same-origin console errors detected",
    );
    assert.deepEqual(
      errors.appHttp.map((e) => `${e.status} ${e.url}`),
      [],
      "same-origin HTTP >= 400 responses detected",
    );
  });

  await check("routes", "every track card links to the correct track", true, async () => {
    await page.goto(`${BASE_URL}/paths`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1, name: "Learning paths" }).waitFor({ timeout: 8000 });
    const links = page.locator('main a[href^="/paths/"]');
    assert.equal(await links.count(), 7, "expected exactly 7 track cards on /paths");
    const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
    const expected = TRACKS.map((t) => `/paths/${t.slug}`);
    assert.deepEqual(hrefs, expected, "track card hrefs do not match the 7 canonical track routes");
  });

  await check("routes", "first lesson navigation works from paths index", true, async () => {
    await page.locator('main a[href="/paths/foundations"]').first().click();
    await page.waitForURL(`${BASE_URL}/paths/foundations`, { timeout: 8000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
    const firstLesson = page.locator('main ol a[href="/paths/foundations/single-server"]').first();
    assert.equal(await firstLesson.count(), 1, "SELECTORS.firstLesson link not found on the track page");
    await firstLesson.click();
    await page.waitForURL(`${BASE_URL}/paths/foundations/single-server`, { timeout: 8000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
  });

  await check("routes", "mobile menu navigates to Paths", false, async () => {
    const mobile = await browser.newContext({ viewport: VIEWPORT_MOBILE, isMobile: true, hasTouch: true });
    try {
      const mobilePage = await newPage(mobile, "mobile-menu");
      await mobilePage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await mobilePage.getByRole("button", { name: "Open menu" }).click();
      await mobilePage
        .getByRole("navigation", { name: "Site menu" })
        .getByRole("link", { name: "Paths" })
        .click();
      await mobilePage.waitForURL(`${BASE_URL}/paths`, { timeout: 8000 });
    } finally {
      await mobile.close();
    }
  });
  // Do not leave the route-crawl page animating in the background while the
  // dedicated landing context measures frame timing.
  await page.close();

  // -- 2. Core learning interactions ----------------------------------------
  const learning = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const lessonPage = await newPage(learning, "learning");
  const lessonUrl = `${BASE_URL}/paths/foundations/single-server`;

  await check("learning", "Story / Engineer / Both controls switch mode without resetting the step", true, async () => {
    await lessonPage.goto(lessonUrl, { waitUntil: "domcontentloaded" });
    await lessonPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 8000 });
    await lessonPage.getByRole("button", { name: "Next", exact: true }).first().click();
    assert.equal(await activeStepNumber(lessonPage), 2, "Next did not advance to step 2");
    const modes = lessonPage.getByRole(SELECTORS.readingMode.role, { name: SELECTORS.readingMode.name });
    for (const name of ["Story", "Engineer", "Both"]) {
      const button = modes.getByRole("button", { name, exact: true });
      await button.click();
      assert.equal(await button.getAttribute("aria-pressed"), "true", `${name} did not become pressed`);
      assert.equal(await activeStepNumber(lessonPage), 2, `${name} reset the active step`);
      // The reader's scroll observer holds for 1000ms. Wait past that so a
      // delayed reset after the mode height animation settles is caught too.
      await lessonPage.waitForTimeout(1100);
      assert.equal(
        await activeStepNumber(lessonPage),
        2,
        `${name} reset the active step after the mode animation settled`,
      );
    }
  });

  await check("learning", "engineer details are on demand via layer tabs / disclosure, never a second wall", true, async () => {
    await lessonPage.goto(lessonUrl, { waitUntil: "domcontentloaded" });
    await lessonPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 8000 });

    const modes = lessonPage.getByRole(SELECTORS.readingMode.role, { name: SELECTORS.readingMode.name });
    // This page shares a browser context (and persisted prefs) with the mode
    // check above. Never assume the persisted mode is still "Both".
    const bothMode = modes.getByRole("button", { name: "Both", exact: true });
    await bothMode.waitFor({ state: "visible", timeout: 8000 });
    await bothMode.click();
    assert.equal(await bothMode.getAttribute("aria-pressed"), "true", "could not switch to Both mode");

    // Both mode: one animated Story/Engineer tab group per step; Story is first.
    // Wait for the layer tabs to mount before asserting on their pressed state.
    const layer = lessonPage
      .getByRole(SELECTORS.readingLayer.role, { name: SELECTORS.readingLayer.name })
      .first();
    await layer.waitFor({ state: "visible", timeout: 8000 });

    const engineer = lessonPage.locator('article:has(> h3:text-is("Engineer"))');
    const visibleEngineerPanels = async () => {
      let visible = 0;
      const count = await engineer.count();
      for (let i = 0; i < count; i += 1) {
        if (await engineer.nth(i).isVisible()) visible += 1;
      }
      return visible;
    };
    const waitForEngineerPanels = (minimum) =>
      lessonPage.waitForFunction(
        (min) => {
          const visible = Array.from(document.querySelectorAll("article")).filter(
            (article) =>
              article.querySelector("h3")?.textContent === "Engineer" && article.getClientRects().length > 0,
          ).length;
          return min === 0 ? visible === 0 : visible >= min;
        },
        minimum,
        { timeout: 8000 },
      );

    // The panel of a previously selected layer can still be exiting.
    await waitForEngineerPanels(0);
    assert.equal(
      await visibleEngineerPanels(),
      0,
      "SELECTORS.engineerPanels: engineer detail panels are visible by default (expected on-demand only)",
    );

    const storyTab = layer.getByRole("button", { name: "Story", exact: true });
    const engineerTab = layer.getByRole("button", { name: "Engineer", exact: true });
    assert.equal(await storyTab.getAttribute("aria-pressed"), "true", "Both mode should open on the Story layer");
    await engineerTab.click();
    await engineer.first().waitFor({ state: "visible", timeout: 8000 });
    assert.ok((await visibleEngineerPanels()) >= 1, "SELECTORS.readingLayer: Engineer tab did not reveal details");
    await storyTab.click();
    // Wait for the engineer panel's AnimatePresence exit before changing mode.
    await waitForEngineerPanels(0);

    // Story mode: the on-demand disclosure replaces the second text column.
    await modes.getByRole("button", { name: "Story", exact: true }).click();
    await layer.waitFor({ state: "hidden", timeout: 8000 });
    const disclosure = lessonPage.getByRole("button", { name: SELECTORS.engineerDisclosure }).first();
    await disclosure.waitFor({ state: "visible", timeout: 8000 });
    await disclosure.click();
    await lessonPage.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("article")).some(
          (article) => article.querySelector("h3")?.textContent === "Engineer" && article.getClientRects().length > 0,
        ),
      undefined,
      { timeout: 8000 },
    );

    // Engineer mode still exposes the layer directly.
    await modes.getByRole("button", { name: "Engineer", exact: true }).click();
    await waitForEngineerPanels(1);
    assert.ok((await visibleEngineerPanels()) >= 1, "Engineer mode did not show engineer details");
  });

  await check("learning", "Next, Previous, step dots, and arrow keys change the active step", true, async () => {
    const navContext = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
    try {
      const navPage = await newPage(navContext, "learning-navigation");
      await navPage.goto(lessonUrl, { waitUntil: "domcontentloaded" });
      await navPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 8000 });
      assert.equal(await activeStepNumber(navPage), 1, "lesson did not start at step 1");
      await navPage.getByRole("button", { name: "Next", exact: true }).first().click();
      assert.equal(await activeStepNumber(navPage), 2, "Next failed");
      await navPage.getByRole("button", { name: "Previous", exact: true }).first().click();
      assert.equal(await activeStepNumber(navPage), 1, "Previous failed");
      const dots = navPage
        .getByRole(SELECTORS.stepControls.role, { name: SELECTORS.stepControls.name })
        .locator("button[aria-label]");
      const third = navPage.getByRole("button", { name: SELECTORS.stepDot }).nth(2);
      assert.ok((await third.count()) > 0, "SELECTORS.stepDot not found");
      await third.click();
      assert.equal(await activeStepNumber(navPage), 3, "step dot failed");
      await navPage.keyboard.press("ArrowRight");
      assert.equal(await activeStepNumber(navPage), 4, "ArrowRight failed");
      await navPage.keyboard.press("ArrowLeft");
      assert.equal(await activeStepNumber(navPage), 3, "ArrowLeft failed");
      assert.ok((await dots.count()) >= 3, "step control nav not found");
    } finally {
      await navContext.close();
    }
  });

  await check("learning", "lesson notes persist after reload", true, async () => {
    await lessonPage.goto(lessonUrl, { waitUntil: "domcontentloaded" });
    const notes = lessonPage.getByLabel(SELECTORS.lessonNotes.label);
    await notes.waitFor({ state: "visible", timeout: 8000 });
    const value = "Remember the bottleneck before adding replicas.";
    await notes.fill(value);
    await lessonPage.reload({ waitUntil: "domcontentloaded" });
    await lessonPage.waitForFunction(
      (expected) => {
        const area = document.querySelector('textarea[id^="note-"]');
        return area instanceof HTMLTextAreaElement && area.value === expected;
      },
      value,
      { timeout: 8000 },
    );
    assert.equal(await lessonPage.getByLabel(SELECTORS.lessonNotes.label).inputValue(), value);
    const saved = await readLearner(lessonPage);
    assert.equal(saved?.notes?.["single-server"], value, "note was not persisted to localStorage");
  });

  await check("learning", "bookmark toggle registers and appears in the utility dock", true, async () => {
    await lessonPage.goto(lessonUrl, { waitUntil: "domcontentloaded" });
    await lessonPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 8000 });
    const bookmark = lessonPage.getByRole(SELECTORS.bookmark.role, { name: SELECTORS.bookmark.name }).first();
    await bookmark.click();
    assert.equal(await bookmark.getAttribute("aria-pressed"), "true", "bookmark aria-pressed did not turn on");
    const saved = await readLearner(lessonPage);
    assert.ok(saved?.bookmarks?.includes("single-server"), "bookmark was not saved to localStorage");
    const launcher = await findLauncher(lessonPage);
    if (!launcher) {
      throw new Error(
        "SELECTORS.dockLauncher: no compact utility launcher found — open the dock panel to see the bookmarks list",
      );
    }
    await launcher.click();
    const popover = lessonPage.locator(SELECTORS.dockPanel).first();
    await popover.waitFor({ state: "visible", timeout: 8000 });
    const savedButton = lessonPage.getByRole("button", { name: /Saved bookmarks/i }).first();
    await savedButton.click();
    await lessonPage.waitForFunction(
      () => {
        const pop = document.querySelector("#platform-utility-popover");
        return Boolean(
          pop &&
            Array.from(pop.querySelectorAll("a")).some(
              (link) => link.getAttribute("href") === "/paths/foundations/single-server",
            ),
        );
      },
      undefined,
      { timeout: 8000 },
    );
    await lessonPage.keyboard.press("Escape");
  });

  await check("learning", "security shield toggle changes state and telemetry", true, async () => {
    await lessonPage.goto(lessonUrl, { waitUntil: "domcontentloaded" });
    await lessonPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 8000 });
    const shield = lessonPage.getByRole(SELECTORS.shield.role, { name: SELECTORS.shield.name }).first();
    await shield.click();
    assert.equal(await shield.getAttribute("aria-pressed"), "true", "shield aria-pressed did not turn on");
    await lessonPage.getByText(/Defense in depth: verified identity/i).waitFor({ timeout: 8000 });
  });

  await check("learning", "blog final step marks the field note as read", true, async () => {
    const blogUrl = `${BASE_URL}/blogs/database-melts-at-10k-rps`;
    await lessonPage.goto(blogUrl, { waitUntil: "domcontentloaded" });
    await lessonPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 8000 });
    await lessonPage.getByRole("button", { name: /^Go to step \d+:/ }).last().click();
    await lessonPage.waitForFunction(
      (key) => {
        const raw = window.localStorage.getItem(key);
        if (!raw) return false;
        try {
          return JSON.parse(raw).readBlogs.includes("database-melts-at-10k-rps");
        } catch {
          return false;
        }
      },
      LEARNER_KEY,
      { timeout: 8000 },
    );
  });
  await learning.close();

  // -- 3. Landing and interactive motion ------------------------------------
  const landing = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const landingPage = await newPage(landing, "landing");

  await check("landing", "hero shows distinct request/response paths and both packet lanes animate", true, async () => {
    await landingPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await landingPage.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
    const model = landingPage.locator(SELECTORS.heroModel).first();
    await model.waitFor({ state: "visible", timeout: 8000 });
    const distinct = await model.locator("path[d]").evaluateAll(
      (nodes) => new Set(nodes.map((node) => node.getAttribute("d"))).size,
    );
    assert.ok(distinct >= 2, `SELECTORS.heroModel: expected distinct request and response paths, found ${distinct}`);

    // Request packets use r=3; response packets use r=2.6. Attack packets stay
    // invisible until the attack control is pressed, so they are excluded here.
    const lanes = () =>
      model.locator("circle").evaluateAll((nodes) => {
        const active = nodes.filter((node) => (node.getAttribute("opacity") ?? "0") !== "0");
        const at = (node) => `${node.getAttribute("cx") ?? ""},${node.getAttribute("cy") ?? ""}`;
        return {
          request: active.filter((node) => node.getAttribute("r") === "3").map(at),
          response: active.filter((node) => node.getAttribute("r") !== "3").map(at),
        };
      });
    await landingPage.waitForFunction(
      (selector) => {
        const hero = document.querySelector(selector);
        if (!hero) return false;
        const active = Array.from(hero.querySelectorAll("circle")).filter(
          (node) => (node.getAttribute("opacity") ?? "0") !== "0",
        );
        return (
          active.filter((node) => node.getAttribute("r") === "3").length >= 5 &&
          active.filter((node) => node.getAttribute("r") !== "3").length >= 3
        );
      },
      SELECTORS.heroModel,
      { timeout: 8000 },
    );
    const before = await lanes();
    assert.ok(before.request.length >= 5, `expected request packet lane, found ${before.request.length} packets`);
    assert.ok(
      before.response.length >= 3,
      `new response path/beam has no moving packets (found ${before.response.length})`,
    );
    await landingPage.waitForTimeout(260);
    const after = await lanes();
    assert.notDeepEqual(after.request, before.request, "request packets did not move along the request path");
    assert.notDeepEqual(after.response, before.response, "response beam packets did not move along the response path");
  });

  await check("landing", "spike, kill-node, and attack controls update aria-pressed and telemetry", true, async () => {
    await landingPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    const spike = landingPage.getByRole(SELECTORS.heroSpike.role, { name: SELECTORS.heroSpike.name });
    await spike.waitFor({ state: "visible", timeout: 8000 });
    await spike.click();
    assert.equal(await spike.getAttribute("aria-pressed"), "true", "spike did not toggle");
    await landingPage.getByText(/360 req\/s/).first().waitFor({ timeout: 6000 });

    const kill = landingPage.getByRole(SELECTORS.heroKill.role, { name: SELECTORS.heroKill.name });
    await kill.click();
    assert.equal(await kill.getAttribute("aria-pressed"), "true", "kill node did not toggle");
    await landingPage.getByText(/API · B down|carrying all/).first().waitFor({ timeout: 6000 });

    const attack = landingPage.getByRole(SELECTORS.heroAttack.role, { name: SELECTORS.heroAttack.name });
    await attack.click();
    assert.equal(await attack.getAttribute("aria-pressed"), "true", "attack did not toggle");
    await landingPage.getByText(/blocked at the edge|\d+ blocked/).first().waitFor({ timeout: 6000 });
  });

  await check("landing", "track showcase has exactly 7 track cards", true, async () => {
    await landingPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    const hrefs = await landingPage.locator('a[href^="/paths/"]').evaluateAll((nodes) =>
      Array.from(new Set(nodes.map((node) => (node.getAttribute("href") ?? "").split("/").filter(Boolean))))
        .filter((parts) => parts.length === 2)
        .map((parts) => `/${parts.join("/")}`),
    );
    const expected = TRACKS.map((t) => `/paths/${t.slug}`);
    assert.deepEqual(hrefs.sort(), expected.sort(), "SELECTORS.trackShowcase: expected 7 unique track cards");
  });

  await check("landing", "90 rAF frames measured within performance thresholds", false, async () => {
    // Use a fresh context so earlier route/interaction checks cannot leave
    // background work that distorts the landing page's frame budget.
    const perfContext = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
    let stats;
    try {
      const perfPage = await newPage(perfContext, "landing-performance");
      await perfPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await perfPage.evaluate(async () => {
        await document.fonts.ready;
      });
      await perfPage.waitForTimeout(2500);
      stats = await perfPage.evaluate(
        () =>
          new Promise((resolve) => {
            const samples = [];
            let previous = 0;
            const frame = (time) => {
              if (previous !== 0) samples.push(time - previous);
              previous = time;
              if (samples.length >= 90) {
                const sorted = [...samples].sort((a, b) => a - b);
                resolve({
                  average: samples.reduce((sum, value) => sum + value, 0) / samples.length,
                  p95: sorted[Math.floor(sorted.length * 0.95)],
                });
              } else {
                requestAnimationFrame(frame);
              }
            };
            requestAnimationFrame(frame);
          }),
      );
    } finally {
      await perfContext.close();
    }
    frameTiming = stats;
    console.log(`      frame timing: avg ${stats.average.toFixed(2)} ms, p95 ${stats.p95.toFixed(2)} ms`);
    assert.ok(stats.average <= 34, `average frame time ${stats.average.toFixed(2)} ms exceeds 34 ms`);
    assert.ok(stats.p95 <= 50, `p95 frame time ${stats.p95.toFixed(2)} ms exceeds 50 ms`);
  });

  await check("landing", "reduced motion disables custom cursor and continuous decorative animation", false, async () => {
    const reduced = await browser.newContext({
      viewport: VIEWPORT_MOBILE,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    try {
      const reducedPage = await newPage(reduced, "reduced-motion");
      await reducedPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await reducedPage.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
      assert.equal(
        await reducedPage.locator(SELECTORS.cursorMode).count(),
        0,
        "SELECTORS.cursorMode: custom cursor still mounted under reduced motion",
      );
      const animated = await reducedPage.evaluate(() =>
        Array.from(document.querySelectorAll('[aria-hidden="true"], [data-decorative]'))
          .filter((element) => {
            const style = window.getComputedStyle(element);
            return style.animationName !== "none" && /infinite/.test(style.animationIterationCount);
          })
          .map((element) => `${element.tagName}.${String(element.className)}`)
          .slice(0, 5),
      );
      assert.deepEqual(animated, [], "continuously animating decorative elements found under reduced motion");
    } finally {
      await reduced.close();
    }
  });
  await landing.close();

  // -- 4. Compact dock and preferences --------------------------------------
  const dock = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const dockPage = await newPage(dock, "dock");

  await check("dock", "utility launcher is compact (<= 56px on each axis) by default", true, async () => {
    await dockPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await dockPage.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
    const launcher = await findLauncher(dockPage);
    if (!launcher) {
      throw new Error(
        "SELECTORS.dockLauncher: no compact launcher found; the dock is still a full-width utility bar",
      );
    }
    const box = await launcher.boundingBox();
    assert.ok(box, "launcher has no bounding box");
    assert.ok(box.width <= 56 && box.height <= 56, `launcher is ${box.width}x${box.height}px (expected <= 56x56)`);
  });

  await check("dock", "opening the dock exposes search, notes, bookmarks, mode, ambient, cursor, break", true, async () => {
    await dockPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await dockPage.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
    const launcher = await findLauncher(dockPage);
    if (!launcher) throw new Error("SELECTORS.dockLauncher: launcher not found before opening dock");
    await launcher.click();
    const groups = [
      ["search", SELECTORS.dockSearch],
      ["notes", SELECTORS.dockNotes],
      ["bookmarks", SELECTORS.dockBookmarks],
      ["mode", SELECTORS.dockMode],
      ["ambient", SELECTORS.dockAmbient],
      ["cursor", SELECTORS.dockCursor],
      ["break", SELECTORS.dockBreak],
    ];
    const missing = [];
    for (const [name, specs] of groups) {
      const absent = await visibleAny(dockPage, specs);
      if (absent.length > 0) missing.push(`${name}: ${absent.join(" or ")}`);
    }
    assert.deepEqual(missing, [], `dock controls missing after opening: ${missing.join("; ")}`);
  });

  await check("dock", "Escape and outside click both close the dock", true, async () => {
    await dockPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await dockPage.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
    const launcher = await findLauncher(dockPage);
    if (!launcher) throw new Error("SELECTORS.dockLauncher: launcher not found");
    await launcher.click();
    assert.ok(await isDockOpen(dockPage, launcher), "dock did not open on launcher click");
    await dockPage.keyboard.press("Escape");
    assert.equal(await isDockOpen(dockPage, launcher), false, "Escape did not close the dock");
    await launcher.click();
    assert.ok(await isDockOpen(dockPage, launcher), "dock did not re-open");
    await dockPage.locator("h1").first().click({ position: { x: 4, y: 4 }, force: true });
    assert.equal(await isDockOpen(dockPage, launcher), false, "outside click did not close the dock");
  });

  await check("dock", "open dock popover fits inside a 390px mobile viewport", true, async () => {
    const mobile = await browser.newContext({ viewport: VIEWPORT_MOBILE, isMobile: true, hasTouch: true });
    try {
      const mobilePage = await newPage(mobile, "dock-mobile");
      await mobilePage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await mobilePage.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
      const launcher = await findLauncher(mobilePage);
      if (!launcher) throw new Error("SELECTORS.dockLauncher: launcher not found at 390px");
      await launcher.click();
      const panels = mobilePage.locator(SELECTORS.dockPanel);
      const count = await panels.count();
      let box = null;
      for (let i = 0; i < count; i += 1) {
        if (await panels.nth(i).isVisible()) {
          box = await panels.nth(i).boundingBox();
          break;
        }
      }
      assert.ok(box, "SELECTORS.dockPanel: no visible popover after opening the dock");
      assert.ok(box.x >= -1, `popover left edge ${box.x}px is off-screen`);
      assert.ok(box.y >= -1, `popover top edge ${box.y}px is off-screen`);
      assert.ok(box.x + box.width <= VIEWPORT_MOBILE.width + 1, `popover right edge ${box.x + box.width}px overflows`);
      assert.ok(box.y + box.height <= VIEWPORT_MOBILE.height + 1, `popover bottom edge ${box.y + box.height}px overflows`);
    } finally {
      await mobile.close();
    }
  });
  await dock.close();

  // -- 5. Quiz and local persistence ----------------------------------------
  const freshQuiz = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const freshQuizPage = await newPage(freshQuiz, "quiz-empty");
  await check("quiz", "fresh context shows the empty state with no active questions", true, async () => {
    await freshQuizPage.goto(`${BASE_URL}/quiz`, { waitUntil: "domcontentloaded" });
    await freshQuizPage.getByText(SELECTORS.quizEmpty).first().waitFor({ timeout: 8000 });
    assert.equal(await freshQuizPage.locator(SELECTORS.quizActive).count(), 0, "unexpected active quiz question");
    const state = await readLearner(freshQuizPage);
    assert.ok(
      state === null ||
        (state.completedLessons.length === 0 && state.visitedTopics.length === 0 && state.quizHistory.length === 0),
      "fresh context should not have seeded learner data",
    );
  });
  await freshQuiz.close();

  const seededQuiz = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  await seed(
    seededQuiz,
    emptyLearner({ completedLessons: ["single-server"], visitedTopics: ["single-server"] }),
  );
  const seededQuizPage = await newPage(seededQuiz, "quiz-seeded");

  await check("quiz", "seeded single-server progress produces a question with exactly 4 choices", true, async () => {
    await seededQuizPage.goto(`${BASE_URL}/quiz`, { waitUntil: "domcontentloaded" });
    const active = seededQuizPage.locator(SELECTORS.quizActive);
    await active.waitFor({ state: "visible", timeout: 8000 });
    assert.equal(await active.locator("button").count(), 4, "SELECTORS.quizActive: expected 4 answer buttons");
  });

  await check("quiz", "answer reveals an explanation and history survives reload", true, async () => {
    const active = seededQuizPage.locator(SELECTORS.quizActive);
    await active.waitFor({ state: "visible", timeout: 8000 });
    await active.locator("button").first().click();
    await seededQuizPage.getByText(/Saved to your local review schedule/i).waitFor({ timeout: 8000 });
    const before = await readLearner(seededQuizPage);
    assert.equal(before?.quizHistory?.length, 1, "answer was not recorded in quizHistory");
    await seededQuizPage.reload({ waitUntil: "domcontentloaded" });
    await seededQuizPage.waitForFunction(
      (key) => {
        const raw = window.localStorage.getItem(key);
        if (!raw) return false;
        try {
          return JSON.parse(raw).quizHistory.length === 1;
        } catch {
          return false;
        }
      },
      LEARNER_KEY,
      { timeout: 8000 },
    );
  });
  await seededQuiz.close();

  const settings = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const settingsPage = await newPage(settings, "settings");

  await check("quiz", "settings exposes export and import controls", true, async () => {
    await settingsPage.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
    const exportButton = settingsPage.getByRole(
      SELECTORS.exportButton.role,
      { name: SELECTORS.exportButton.name },
    );
    await exportButton.waitFor({ state: "visible", timeout: 8000 });
    assert.equal(await exportButton.isEnabled(), true);
    const importInput = settingsPage.getByLabel(SELECTORS.importInput.label);
    assert.equal(await importInput.count(), 1, "SELECTORS.importInput: file input not found");
    // Deliberately do not click Export: no file download side effects in QA.
  });

  await check("quiz", "preference changes persist after reload", false, async () => {
    await settingsPage.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
    const cursor = settingsPage.getByRole("checkbox", { name: "Custom cursor" }).first();
    await cursor.waitFor({ state: "visible", timeout: 8000 });
    const next = !(await cursor.isChecked());
    await cursor.setChecked(next);
    await settingsPage.reload({ waitUntil: "domcontentloaded" });
    // The store hydrates from localStorage in an effect, so the checkbox can
    // briefly show its default value. Require BOTH the persisted pref and the
    // hydrated checkbox to agree before asserting.
    await settingsPage.waitForFunction(
      ({ key, expected }) => {
        try {
          const raw = window.localStorage.getItem(key);
          if (!raw || JSON.parse(raw)?.prefs?.cursor !== expected) return false;
        } catch {
          return false;
        }
        const checkbox = document.querySelector('input[type="checkbox"][aria-label="Custom cursor"]');
        return checkbox instanceof HTMLInputElement && checkbox.checked === expected;
      },
      { key: LEARNER_KEY, expected: next },
      { timeout: 8000 },
    );
    const after = settingsPage.getByRole("checkbox", { name: "Custom cursor" }).first();
    await after.waitFor({ state: "visible", timeout: 8000 });
    assert.equal(await after.isChecked(), next, "custom cursor preference did not survive reload");
  });
  await settings.close();

  // -- 6. Tools, map, and labs ----------------------------------------------
  const tools = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const toolsPage = await newPage(tools, "tools");

  await check("tools", "capacity estimator output updates when DAU changes", true, async () => {
    await toolsPage.goto(`${BASE_URL}/tools`, { waitUntil: "domcontentloaded" });
    const region = toolsPage.getByRole(
      SELECTORS.capacityRegion.role,
      { name: SELECTORS.capacityRegion.name },
    );
    const beforeMatch = (await regionText(toolsPage, region)).match(/Average QPS\s+([\d,.]+)/);
    assert.ok(beforeMatch, "could not read Average QPS from the capacity region");
    await toolsPage.getByLabel("Daily active users").fill("200000");
    const expectedQps = ((200000 * 12) / 86400).toFixed(2);
    await toolsPage.waitForFunction(
      (expected) =>
        new RegExp(`Average QPS\\s+${expected.replace(".", "\\.")}`).test(document.body.innerText),
      expectedQps,
      { timeout: 8000 },
    );
    const afterMatch = (await regionText(toolsPage, region)).match(/Average QPS\s+([\d,.]+)/);
    assert.ok(afterMatch && afterMatch[1] !== beforeMatch[1], "Average QPS did not change with DAU");
  });

  await check("tools", "KV cache and SLA calculators render finite numeric values", true, async () => {
    await toolsPage.goto(`${BASE_URL}/tools`, { waitUntil: "domcontentloaded" });
    for (const spec of [SELECTORS.kvRegion, SELECTORS.slaRegion]) {
      const text = await regionText(toolsPage, toolsPage.getByRole(spec.role, { name: spec.name }));
      assert.ok(!/NaN|Infinity|undefined/i.test(text), `${spec.name} rendered a non-finite value`);
      const numbers = text.match(/-?\d+(?:\.\d+)?/g) ?? [];
      assert.ok(numbers.length >= 6, `${spec.name} rendered too few numeric outputs (${numbers.length})`);
      for (const value of numbers) {
        assert.ok(Number.isFinite(Number(value.replace(/,/g, ""))), `${spec.name} rendered ${value}`);
      }
    }
  });

  await check("tools", "notation search returns the p99 entry", true, async () => {
    await toolsPage.goto(`${BASE_URL}/tools`, { waitUntil: "domcontentloaded" });
    await toolsPage.getByLabel(SELECTORS.notationSearch.label).fill("p99");
    const region = toolsPage.getByRole(SELECTORS.notationRegion.role, { name: SELECTORS.notationRegion.name });
    const text = await regionText(toolsPage, region);
    assert.match(text, /p99/i, "notation decoder did not return p99");
    assert.match(text, /99 percent/i, "p99 explanation is missing");
  });

  await check("tools", "security checklist exposes component filters", true, async () => {
    await toolsPage.goto(`${BASE_URL}/tools`, { waitUntil: "domcontentloaded" });
    const region = toolsPage.getByRole(SELECTORS.securityRegion.role, { name: SELECTORS.securityRegion.name });
    await region.waitFor({ state: "visible", timeout: 8000 });
    const groups = await region.locator("details").count();
    assert.ok(groups >= 6, `SELECTORS.securityRegion: expected at least 6 component groups, found ${groups}`);
    const text = await regionText(toolsPage, region);
    for (const label of ["Edge and transport", "API and identity", "Data and storage", "Kubernetes", "Model-powered systems"]) {
      assert.ok(text.includes(label), `security checklist is missing the "${label}" filter`);
    }
  });

  await check("tools", "map search finds the Kafka field note or lab", true, async () => {
    await toolsPage.goto(`${BASE_URL}/map`, { waitUntil: "domcontentloaded" });
    await toolsPage.getByPlaceholder(SELECTORS.mapSearch.placeholder).fill("Kafka");
    const match = toolsPage.getByRole("link", { name: /kafka/i }).first();
    await match.waitFor({ state: "visible", timeout: 8000 });
  });

  await check("tools", "lab brief exposes a start / open-canvas action", true, async () => {
    await toolsPage.goto(`${BASE_URL}/labs/bitly-url-shortener`, { waitUntil: "domcontentloaded" });
    const action = toolsPage.getByRole("button", { name: SELECTORS.labStart }).first();
    await action.waitFor({ state: "visible", timeout: 8000 });
    assert.equal(await action.isEnabled(), true, "lab start action is disabled");
    // Do not click: starting the workspace launches a long-running simulation.
  });
  await tools.close();

  // -- 7. Responsiveness, reduced motion, accessibility basics --------------
  const a11y = await browser.newContext({ viewport: VIEWPORT_DESKTOP });
  const a11yPage = await newPage(a11y, "a11y");

  await check("a11y", "each main route has exactly one h1", true, async () => {
    const routes = [
      "/",
      "/paths",
      "/paths/foundations/single-server",
      "/blogs",
      "/blogs/database-melts-at-10k-rps",
      "/labs",
      "/labs/bitly-url-shortener",
      "/map",
      "/tools",
      "/quiz",
      "/settings",
      "/privacy",
    ];
    const bad = [];
    for (const route of routes) {
      await a11yPage.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
      await a11yPage.locator("h1").first().waitFor({ state: "visible", timeout: 8000 });
      const count = await a11yPage.locator("h1").count();
      if (count !== 1) bad.push(`${route}: ${count} h1 elements`);
    }
    assert.deepEqual(bad, [], "routes with an incorrect h1 count");
  });

  await check("a11y", "buttons and links have accessible names", true, async () => {
    const bad = [];
    for (const route of ["/", "/paths", "/quiz", "/tools", "/settings"]) {
      await a11yPage.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
      await a11yPage.locator("body").waitFor({ state: "visible", timeout: 8000 });
      const unnamed = await a11yPage.evaluate(() =>
        Array.from(document.querySelectorAll("a, button"))
          .filter((element) => element.getClientRects().length > 0)
          .filter((element) => {
            const labelled =
              element.getAttribute("aria-label")?.trim() ||
              element.getAttribute("title")?.trim() ||
              element.textContent?.trim() ||
              element.querySelector("img[alt]")?.getAttribute("alt")?.trim();
            return !labelled;
          })
          .map((element) => element.outerHTML.slice(0, 120))
          .slice(0, 5),
      );
      for (const html of unnamed) bad.push(`${route}: ${html}`);
    }
    assert.deepEqual(bad, [], "visible controls without accessible names");
  });

  await check("a11y", "no horizontal overflow at 390px on main routes", true, async () => {
    const mobile = await browser.newContext({ viewport: VIEWPORT_MOBILE, isMobile: true, hasTouch: true });
    try {
      const mobilePage = await newPage(mobile, "a11y-mobile");
      const overflow = [];
      for (const route of ["/", "/paths", "/paths/foundations/single-server", "/tools", "/quiz"]) {
        await mobilePage.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
        await mobilePage.locator("body").waitFor({ state: "visible", timeout: 8000 });
        const delta = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (delta > 1) overflow.push(`${route}: ${delta}px`);
      }
      assert.deepEqual(overflow, [], "horizontal overflow detected");
    } finally {
      await mobile.close();
    }
  });

  await check("a11y", "keyboard focus shows a visible outline or ring", true, async () => {
    await a11yPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await a11yPage.locator("body").waitFor({ state: "visible", timeout: 8000 });
    let visibleFocus = false;
    for (let i = 0; i < 8; i += 1) {
      await a11yPage.keyboard.press("Tab");
      const state = await a11yPage.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return null;
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName,
          outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
          ring: style.boxShadow !== "none" && style.boxShadow !== "",
        };
      });
      if (state && (state.outline || state.ring)) {
        visibleFocus = true;
        break;
      }
    }
    assert.ok(visibleFocus, "no focused element showed a visible outline/ring within 8 Tab presses");
  });
  await a11y.close();
} catch (fatal) {
  const detail = fatal instanceof Error ? (fatal.stack ?? fatal.message) : String(fatal);
  checks.push({ category: "harness", name: "QA runner completed without a fatal error", critical: true, passed: false, detail });
  console.log("FAIL  harness — QA runner completed without a fatal error [CRITICAL]");
  console.log(`      ${detail.split("\n")[0]}`);
} finally {
  if (browser) await browser.close();
}

const score = calculateScore();
writeScorecard(score);

console.log("");
console.log(`Score: ${score.total} / 100`);
for (const row of score.summary) {
  console.log(`  ${row.label}: ${row.earned}/${row.weight} (${row.passed}/${row.total} checks)`);
}
console.log(`Scorecard written to ${SCORECARD_PATH}`);

const criticalFailures = checks.filter((item) => !item.passed && item.critical);
if (criticalFailures.length > 0) {
  console.error(`\n${criticalFailures.length} critical check(s) failed:`);
  for (const failure of criticalFailures) console.error(`  - ${failure.category} — ${failure.name}`);
  process.exitCode = 1;
} else {
  console.log("\nNo critical failures. Non-critical failures (if any) are recorded in the scorecard.");
}
