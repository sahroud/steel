"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

const baseURL = process.env.SAHROUD_STEEL_BASE_URL || "http://127.0.0.1:4173";
let stage = "launch Chromium";
const watchdog = setTimeout(() => {
  console.error("Browser round-trip exceeded 180 seconds at stage: " + stage);
  process.exit(124);
}, 180000);

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "unknown" }));
  page.on("response", response => { if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() }); });

  try {
    stage = "load index.html";
    const response = await page.goto(baseURL, { waitUntil: "commit", timeout: 30000 });
    assert.ok(response && response.ok(), "index.html should load successfully");
    // page.goto(waitUntil: commit) only confirms response headers; wait until all classic scripts and DOMContentLoaded handlers have run.
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    try {
      await page.waitForFunction(() => Boolean(window.SteelProject && window.SahroudMemberEndConnectionUI), null, { timeout: 12000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        readyState: document.readyState,
        steelProject: typeof window.SteelProject,
        braceUI: typeof window.SahroudMemberEndConnectionUI,
        scripts: [...document.scripts].map(s => s.src).filter(Boolean),
        loaded: performance.getEntriesByType("resource").filter(r => /project.js|member-end-connection-ui.js/.test(r.name)).map(r => ({ name: r.name, duration: r.duration, transferSize: r.transferSize }))
      }));
      throw new Error("Application globals did not initialize: " + JSON.stringify({ diagnostics, pageErrors, consoleErrors, failedRequests, badResponses }));
    }

    stage = "build full shed model";
    await page.locator("#btnBuildFullModel").waitFor({ state: "visible" });
    await page.locator("#btnBuildFullModel").click();
    await page.locator("#braceConnectionMember").waitFor({ state: "visible", timeout: 30000 });

    stage = "select brace and edit I/J releases";
    const memberSelect = page.locator("#braceConnectionMember");
    await page.waitForFunction(() => {
      const select = document.getElementById("braceConnectionMember");
      return select && select.options.length > 1;
    }, null, { timeout: 30000 });
    const braceId = await memberSelect.locator("option").nth(1).getAttribute("value");
    assert.ok(braceId, "a generated brace member should be selectable");
    await memberSelect.selectOption(braceId);

    await page.locator("#braceConnectionI").selectOption("pinned");
    await page.locator("#braceConnectionJ").selectOption("continuous");
    await page.waitForFunction(id => {
      const member = window.SteelStructuralModel?.model?.members?.find(item => String(item.id) === id);
      return member?.endReleases?.i?.join(",") === "rx,ry,rz";
    }, braceId, { timeout: 10000 });

    stage = "export project JSON";
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#btnSave").click()
    ]);
    const downloadPath = await download.path();
    assert.ok(downloadPath, "project JSON download should be created");
    const exported = JSON.parse(fs.readFileSync(downloadPath, "utf8"));
    assert.ok(exported.memberEndConnections.some(item =>
      item.memberId === braceId && item.i === "pinned" && item.j === "continuous"
    ), "exported JSON should preserve independent I/J selections");

    stage = "import JSON and verify autosave";
    const importPayload = Buffer.from(JSON.stringify({
      ...exported,
      projectName: "آزمون واقعی مرورگر",
      memberEndConnections: [{ memberId: braceId, i: "continuous", j: "pinned" }]
    }), "utf8");
    await page.locator("#projectFile").setInputFiles({
      name: "browser-round-trip.json",
      mimeType: "application/json",
      buffer: importPayload
    });
    await page.locator("#projectName").waitFor();
    await page.waitForFunction(() => document.getElementById("projectName").value === "آزمون واقعی مرورگر");
    const restored = await page.evaluate(id => {
      const item = window.SahroudMemberEndConnectionUI.getData().find(x => x.memberId === id);
      const autosave = JSON.parse(localStorage.getItem("sahroudSteelProject.autosave.v3") || "null");
      return {
        item,
        autosaveItem: autosave?.memberEndConnections?.find(x => x.memberId === id)
      };
    }, braceId);
    assert.deepEqual(restored.item, { memberId: braceId, i: "continuous", j: "pinned" });
    assert.deepEqual(restored.autosaveItem, restored.item);

    stage = "reload and verify restored state";
    await page.reload({ waitUntil: "commit", timeout: 30000 });
    await page.waitForFunction(() => document.getElementById("projectName")?.value === "آزمون واقعی مرورگر");
    const afterReload = await page.evaluate(id =>
      window.SahroudMemberEndConnectionUI.getData().find(x => x.memberId === id) || null, braceId);
    assert.deepEqual(afterReload, { memberId: braceId, i: "continuous", j: "pinned" });
    assert.deepEqual(pageErrors, [], "browser should not emit uncaught page errors");
    stage = "completed";
    process.stdout.write("PASS: Chromium page load, shed build, brace I/J editing, JSON download/import, autosave and reload round-trip.\\n");
  } finally {
    clearTimeout(watchdog);
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
