"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadEngine() {
  const loads = {
    climate: { basicWind: "90", customCity: "شاهرود", source: "ورودی آزمایشی" },
    deadLeft: 0.5, deadRight: 0.5,
    liveLeft: 0.75, liveRight: 0.75,
    snowLeft: 1, snowRight: 1,
    windLeft: 0, windRight: 0, windWall: 0,
    windEndFront: 0, windEndBack: 0,
    windDirection: "left-to-right"
  };
  const sandbox = {
    document: { readyState: "loading", getElementById: () => null, addEventListener: () => {} },
    window: { SteelLoads: { getData: () => loads } },
    Date
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../js/climate-load-engine.js"), "utf8"), sandbox);
  return sandbox.window.SteelClimateLoadEngine;
}

test("wind registry preserves the basic pressure but never promotes it to code design", () => {
  const engine = loadEngine();
  const data = engine.getData();
  const expected = 0.000613 * Math.pow(90 / 3.6, 2);
  assert.ok(Math.abs(data.climate.basicWindPressure - expected) < 1e-12);
  assert.equal(data.status, "preliminary-input-registry");
  assert.equal(data.climate.windCalculationStatus, "basic-pressure-only; terrain and building coefficients not yet applied");
  assert.ok(data.cases.length >= 6);
  for (const item of data.cases) assert.equal(item.eligibleForCodeDesign, false);
  assert.equal(data.windCalculation.status, "manual-code-coefficients-calculated-for-multiple-surfaces-not-applied-to-3d-model");
});

test("missing code coefficients leave external and internal wind pressures uncalculated", () => {
  const engine = loadEngine();
  const data = engine.getData();
  assert.equal(data.windCalculation.zoneResults.ready, false);
  for (const row of Object.values(data.windCalculation.zoneResults.rows)) assert.equal(row, null);
  assert.equal(data.windCalculation.coefficients.importance, "");
  assert.equal(data.windCalculation.coefficients.externalPressure, "");
});
