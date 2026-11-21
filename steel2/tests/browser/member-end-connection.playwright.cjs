"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

const baseURL = process.env.SAHROUD_STEEL_BASE_URL || "http://127.0.0.1:4173";

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  try {
    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert.ok(response && response.ok(), "index.html should load successfully");
    await page.waitForFunction(() => Boolean(window.SteelProject && window.SahroudMemberEndConnectionUI), null, { timeout: 30000 });

    await page.locator("#btnBuildFullModel").waitFor({ state: "visible" });
    await page.locator("#btnBuildFullModel").click();
    await page.locator("#braceConnectionMember").waitFor({ state: "visible", timeout: 30000 });

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

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.getElementById("projectName")?.value === "آزمون واقعی مرورگر");
    const afterReload = await page.evaluate(id =>
      window.SahroudMemberEndConnectionUI.getData().find(x => x.memberId === id) || null, braceId);
    assert.deepEqual(afterReload, { memberId: braceId, i: "continuous", j: "pinned" });
    assert.deepEqual(pageErrors, [], "browser should not emit uncaught page errors");
    process.stdout.write("PASS: Chromium page load, shed build, brace I/J editing, JSON download/import, autosave and reload round-trip.\\n");
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
