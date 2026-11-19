"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../js/connection-design.js"),"utf8");
test("preliminary weld demand panel never supplies invented geometry defaults",()=>{
 assert.match(source,/function field\(id, label, unit\)/);
 assert.match(source,/فقط مقدار واقعی نقشه را وارد کنید/);
 assert.doesNotMatch(source,/connPlateWidth[^\n]*value=/);
 assert.doesNotMatch(source,/connPlateHeight[^\n]*value=/);
 assert.doesNotMatch(source,/connPlateThickness/);
});
test("preliminary weld demand requires positive entered group dimensions",()=>{
 assert.match(source,/if\s*\(!\(b>0\s*&&\s*h>0\)\)/);
 assert.match(source,/SahroudWeldGroupDemand\.analyze/);
 assert.match(source,/ظرفیت طراحی جوش محاسبه نشده/);
});
