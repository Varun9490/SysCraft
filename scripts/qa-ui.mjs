import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const failures = [];
const consoleErrors = [];

async function run(name, task) {
  try {
    await task();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function watchErrors(page) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      consoleErrors.push(`${message.text()} @ ${location.url}:${location.lineNumber ?? ""}`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desktop.newPage();
watchErrors(page);

await run("landing hero controls", async () => {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  const spike = page.getByRole("button", { name: "Spike traffic 3×" });
  await spike.click();
  assert.equal(await spike.getAttribute("aria-pressed"), "true");
  const attack = page.getByRole("button", { name: "Simulate attack" });
  await attack.click();
  assert.equal(await attack.getAttribute("aria-pressed"), "true");
});

await run("animation frame smoke", async () => {
  const stats = await page.evaluate(() => new Promise((resolve) => {
    const samples = [];
    let previous = 0;
    const frame = (time) => {
      if (previous !== 0) samples.push(time - previous);
      previous = time;
      if (samples.length >= 90) {
        const sorted = [...samples].sort((a, b) => a - b);
        resolve({ average: samples.reduce((sum, value) => sum + value, 0) / samples.length, p95: sorted[Math.floor(sorted.length * 0.95)] });
      } else {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }));
  assert.ok(stats.average < 25, `average frame time ${stats.average.toFixed(2)}ms`);
  assert.ok(stats.p95 < 40, `p95 frame time ${stats.p95.toFixed(2)}ms`);
  console.log(`Frame timing: avg ${stats.average.toFixed(2)}ms, p95 ${stats.p95.toFixed(2)}ms`);
});

const pathsContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pathsPage = await pathsContext.newPage();
watchErrors(pathsPage);
await run("learning paths navigation", async () => {
  const flowErrors = [];
  const onConsole = (message) => {
    if (message.type() === "error") flowErrors.push(message.text());
  };
  const onPageError = (error) => flowErrors.push(error.message);
  pathsPage.on("console", onConsole);
  pathsPage.on("pageerror", onPageError);

  try {
    await pathsPage.goto(`${baseUrl}/paths`, { waitUntil: "domcontentloaded" });
    await pathsPage.getByRole("heading", { level: 1, name: "Learning paths" }).waitFor();
    const trackLinks = pathsPage.locator('main a[href^="/paths/"]');
    assert.equal(await trackLinks.count(), 7);
    assert.deepEqual(await trackLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))), [
      "/paths/foundations",
      "/paths/distributed",
      "/paths/case-studies",
      "/paths/ai-engineering",
      "/paths/llm-inference",
      "/paths/ml-math",
      "/paths/backend-cloud",
    ]);

    await pathsPage.locator('main a[href="/paths/foundations"]').first().click();
    await pathsPage.waitForURL(`${baseUrl}/paths/foundations`);
    await pathsPage.getByRole("heading", { level: 1, name: "System Design Foundations" }).waitFor();

    const firstLesson = pathsPage.locator('main ol a[href="/paths/foundations/single-server"]').first();
    assert.equal(await firstLesson.count(), 1);
    await firstLesson.click();
    await pathsPage.waitForURL(`${baseUrl}/paths/foundations/single-server`);
    await pathsPage.getByRole("heading", { level: 1, name: "Single Server to Scale" }).waitFor();
  } finally {
    pathsPage.off("console", onConsole);
    pathsPage.off("pageerror", onPageError);
  }

  assert.deepEqual(flowErrors, []);
});

await run("lesson step, mode, and notes persistence", async () => {
  await page.goto(`${baseUrl}/paths/foundations/single-server`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Single Server to Scale" }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).first().click();
  const current = page.locator('[aria-current="step"]');
  assert.match((await current.getAttribute("aria-label")) ?? "", /step 2/i);
  await page.getByRole("group", { name: "Reading mode" }).getByRole("button", { name: "Engineer", exact: true }).click();
  await page.waitForFunction(() =>
    !Array.from(document.querySelectorAll("h3")).some((heading) => heading.textContent?.trim() === "Story"),
  );
  assert.equal(await page.locator("h3", { hasText: "Story" }).count(), 0);
  const notes = page.getByLabel("Notes for this lesson");
  await notes.fill("Remember the bottleneck before adding replicas.");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Notes for this lesson").waitFor();
  await page.waitForFunction(() => {
    const element = document.querySelector('textarea[id^="note-"]');
    return element instanceof HTMLTextAreaElement && element.value === "Remember the bottleneck before adding replicas.";
  });
  assert.equal(await page.getByLabel("Notes for this lesson").inputValue(), "Remember the bottleneck before adding replicas.");
});

await run("blog read tracking", async () => {
  await page.goto(`${baseUrl}/blogs/database-melts-at-10k-rps`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  const lastStep = page.getByRole("button", { name: /Go to step \d+:/ }).last();
  await lastStep.click();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem("syscraft.learner.v1");
    if (!raw) return false;
    return JSON.parse(raw).readBlogs.includes("database-melts-at-10k-rps");
  });
});

await run("tools and map render real content", async () => {
  await page.goto(`${baseUrl}/tools`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Daily active users").waitFor();
  assert.equal(await page.getByLabel("Daily active users").count(), 1);
  await page.goto(`${baseUrl}/map`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Engineering field notes" }).waitFor();
  await page.getByPlaceholder("Find a track or lesson").fill("Kafka");
  assert.ok((await page.getByRole("link", { name: /Anatomy of Kafka Consumer Lag/i }).count()) > 0);
});

const emptyQuiz = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const quizPage = await emptyQuiz.newPage();
watchErrors(quizPage);
await run("quiz empty state for a new learner", async () => {
  await quizPage.goto(`${baseUrl}/quiz`, { waitUntil: "domcontentloaded" });
  await quizPage.getByRole("link", { name: /start.*lesson|browse all paths/i }).first().waitFor();
});

const readQuiz = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await readQuiz.addInitScript(() => {
  localStorage.setItem("syscraft.learner.v1", JSON.stringify({
    version: 1,
    completedLessons: ["single-server"],
    readBlogs: [],
    visitedTopics: ["single-server"],
    mastery: {},
    quizHistory: [],
    notes: {},
    bookmarks: [],
    resume: null,
    prefs: { mode: "both", theme: "dark", ambient: false, cursor: false, breakMinutes: 0 },
  }));
});
const readQuizPage = await readQuiz.newPage();
watchErrors(readQuizPage);
await run("quiz uses read-topic questions", async () => {
  await readQuizPage.goto(`${baseUrl}/quiz`, { waitUntil: "domcontentloaded" });
  await readQuizPage.locator('[data-quiz-active="true"]').waitFor();
  assert.equal(await readQuizPage.locator('[data-quiz-active="true"] button').count(), 4);
});

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
const mobilePage = await mobile.newPage();
watchErrors(mobilePage);
await run("mobile menu and reduced-motion cursor", async () => {
  await mobilePage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await mobilePage.getByRole("button", { name: "Open menu" }).click();
  await mobilePage.getByRole("navigation", { name: "Site menu" }).getByRole("link", { name: "Paths" }).click();
  await mobilePage.waitForURL(`${baseUrl}/paths`);
  assert.equal(await mobilePage.locator("[data-cursor-mode]").count(), 0);
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `horizontal overflow: ${overflow}px`);
});

await browser.close();

if (consoleErrors.length > 0) {
  failures.push(`console errors:\n${Array.from(new Set(consoleErrors)).join("\n")}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} QA failure(s):\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("\nAll browser QA checks passed with no console errors.");
}
