"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync(require.resolve("../js/model-3d.js"), "utf8");

test("wind pressure is transferred from roof purlins normal to both roof slopes", () => {
  assert.match(source, /m\.sectionKey==="roofPurlin"/);
  assert.match(source, /global\[0\]\+=left\*slope\/norm-right\*slope\/norm/);
  assert.match(source, /global\[1\]-=\(left\+right\)\/norm/);
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
  assert.match(source, /const faceSign=m\.endFace==="front"\?1:-1/);
  assert.match(source, /startGlobal=\[global\[0\],global\[1\],global\[2\]\+faceSign\*startPressure/);
  assert.match(source, /endGlobal=\[global\[0\],global\[1\],global\[2\]\+faceSign\*endPressure/);
  assert.match(source, /linearLocal:\s*\{/);
  assert.match(source, /globalToLocalVector\(startGlobal,tr\.axes\)/);
  assert.match(source, /globalToLocalVector\(endGlobal,tr\.axes\)/);
});

test("wind factor and signed net pressure are applied without silently using climate basic pressure", () => {
  assert.match(source, /const windFactor=selected\.key==="wind"\?1:selected\.windFactor/);
  assert.match(source, /const windSign=selected\.key==="wind"\?1:selected\.windSign/);
  assert.match(source, /Wind inputs are signed NET pressures/);
  assert.doesNotMatch(source, /basicWindPressure/);
});
