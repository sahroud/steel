"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync(require.resolve("../js/model-3d.js"), "utf8");

test("wind pressure is transferred from roof purlins normal to both roof slopes", () => {
  assert.match(source, /m\.sectionKey==="roofPurlin"/);
  assert.match(source, /windLeft\).*slope\/norm/);
  assert.match(source, /windRight\).*slope\/norm/);
  assert.match(source, /\(left\+right\)\/norm/);
});

test("longitudinal wall pressure preserves sign and reverses global X by wall side", () => {
  assert.match(source, /m\.sectionKey==="wallGirt"/);
  assert.match(source, /m\.side==="left"\?wall:-wall/);
  assert.match(source, /loads\.windWall/);
});

test("front and rear end-wall pressure is transferred with opposite global Z signs", () => {
  assert.match(source, /m\.sectionKey==="endGirt"/);
  assert.match(source, /loads\.windEndFront/);
  assert.match(source, /loads\.windEndBack/);
  assert.match(source, /m\.endFace==="front"\?endWall:-endWall/);
});

test("wind factor and signed net pressure are applied without silently using climate basic pressure", () => {
  assert.match(source, /const windFactor=selected\.key==="wind"\?1:selected\.windFactor/);
  assert.match(source, /const windSign=selected\.key==="wind"\?1:selected\.windSign/);
  assert.match(source, /Wind inputs are signed NET pressures/);
  assert.doesNotMatch(source, /basicWindPressure/);
});
