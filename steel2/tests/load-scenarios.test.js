"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
test("load scenarios are clearly marked gravity-only and preliminary", () => {
  const sandbox = {
    document: { getElementById: () => null, addEventListener: () => {} },
    window: {}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../js/loads.js"), "utf8"), sandbox);
  const combos = sandbox.window.SteelLoads.getData().combinations;
  assert.equal(combos.length, 3);
  for (const combo of combos) {
    assert.equal(combo.classification, "preliminary-gravity-only");
    assert.equal(combo.status, "not-code-verified");
    assert.equal(combo.includesWind, false);
    assert.equal(combo.includesSeismic, false);
    assert.equal(combo.liveLoadKind, "Lr");
    assert.doesNotMatch(combo.name, /ULS/);
  }
});
test("legacy project data cannot silently promote scenarios to code-verified", () => {
  const sandbox = {
    document: { getElementById: () => null, addEventListener: () => {} },
    window: {}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../js/loads.js"), "utf8"), sandbox);
  sandbox.window.SteelLoads.setData({ combinations: [{dead:1.4,live:0,snow:0}] });
  const combo = sandbox.window.SteelLoads.getData().combinations[0];
  assert.equal(combo.classification, "preliminary-gravity-only");
  assert.equal(combo.status, "not-code-verified");
  assert.equal(combo.includesWind, false);
  assert.equal(combo.includesSeismic, false);
});
