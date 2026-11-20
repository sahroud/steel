"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../js");
test("flexure screening never reports a member as passed", () => {
  const source = fs.readFileSync(path.join(root, "flexure.js"), "utf8");
  assert.match(source, /غیرقابل ارزیابی نهایی/);
  assert.match(source, /بدون نتیجه قبولی/);
  assert.match(source, /برای اعلام قبول\/رد عضو معتبر نیست/);
  assert.doesNotMatch(source, /قبول مقدماتی/);
});
test("shear screening does not label nominal shear as design strength or pass", () => {
  const source = fs.readFileSync(path.join(root, "shear.js"), "utf8");
  assert.match(source, /Vn تخمینی غربال/);
  assert.match(source, /ضریب مقاومت طراحی اعمال نشده/);
  assert.match(source, /غیرقابل ارزیابی نهایی/);
  assert.match(source, /برای اعلام قبول\/رد عضو معتبر نیست/);
  assert.doesNotMatch(source, /قبول مقدماتی/);
});
