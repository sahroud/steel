"use strict";

const { test, expect, chromium } = require("playwright");
const path = require("node:path");

const baseURL = process.env.SAHROUD_STEEL_BASE_URL || "http://127.0.0.1:4173";

test("real Chromium: build shed, edit brace ends, export/import JSON and survive reload", async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  try {
    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 60000 });
    expect(response && response.ok()).toBeTruthy();
    await expect.poll(() => page.evaluate(() => Boolean(window.SteelProject && window.SahroudMemberEndConnectionUI))).toBeTruthy();

    await expect(page.locator("#btnBuildFullModel")).toHaveCount(1);
    await page.locator("#btnBuildFullModel").click();
    await expect(page.locator("#braceConnectionMember")).toHaveCount(1, { timeout: 30000 });

    const memberSelect = page.locator("#braceConnectionMember");
    await expect.poll(() => memberSelect.locator("option").count()).toBeGreaterThan(1);
    const braceId = await memberSelect.locator("option").nth(1).getAttribute("value");
    expect(braceId).toBeTruthy();
    await memberSelect.selectOption(braceId);

    await page.locator("#braceConnectionI").selectOption("pinned");
    await page.locator("#braceConnectionJ").selectOption("continuous");
    await expect.poll(() => page.evaluate(id => {
      const member = window.SteelStructuralModel?.model?.members?.find(item => String(item.id) === id);
      return member?.endReleases?.i?.join(",") || "";
    }, braceId)).toBe("rx,ry,rz");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#btnSave").click()
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const fs = require("node:fs");
    const exported = JSON.parse(fs.readFileSync(downloadPath, "utf8"));
    expect(exported.memberEndConnections).toContainEqual({
      memberId: braceId, i: "pinned", j: "continuous"
    });

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
    await expect(page.locator("#projectName")).toHaveValue("آزمون واقعی مرورگر");
    await expect.poll(() => page.evaluate(() => {
      const data = window.SahroudMemberEndConnectionUI.getData();
      return data.find(item => item.memberId === "__BRACE_ID__")?.j || "";
    })).toBe("");

    const restored = await page.evaluate(id => {
      const item = window.SahroudMemberEndConnectionUI.getData().find(x => x.memberId === id);
      const autosave = JSON.parse(localStorage.getItem("sahroudSteelProject.autosave.v3") || "null");
      return {
        item,
        autosaveItem: autosave?.memberEndConnections?.find(x => x.memberId === id)
      };
    }, braceId);
    expect(restored.item).toEqual({ memberId: braceId, i: "continuous", j: "pinned" });
    expect(restored.autosaveItem).toEqual(restored.item);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#projectName")).toHaveValue("آزمون واقعی مرورگر");
    const afterReload = await page.evaluate(id =>
      window.SahroudMemberEndConnectionUI.getData().find(x => x.memberId === id) || null, braceId);
    expect(afterReload).toEqual({ memberId: braceId, i: "continuous", j: "pinned" });

    expect(pageErrors, "uncaught browser page errors").toEqual([]);
  } finally {
    await context.close();
    await browser.close();
  }
});
