"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../js/knee-connection-detail-ui.js"),"utf8");
test("knee detail UI is wired after member geometry and validator",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const geometry=html.indexOf("js/knee-connection-geometry.js");
 const validator=html.indexOf("js/knee-connection-detail.js");
 const ui=html.indexOf("js/knee-connection-detail-ui.js");
 assert.ok(geometry>=0&&validator>geometry&&ui>validator);
});
test("knee detail editor template leaves fabrication geometry blank",()=>{
 assert.match(source,/originM:null/);
 assert.match(source,/axes:\{x:null,y:null,z:null\}/);
 assert.match(source,/plates:\[\]/);
 assert.match(source,/bolts:\[\]/);
 assert.match(source,/welds:\[\]/);
 assert.match(source,/verifiedByDrawing:false/);
});
test("knee detail UI validates JSON and never claims capacity or execution approval",()=>{
 assert.match(source,/SahroudKneeConnectionDetail\.validate/);
 assert.match(source,/ظرفیت طراحی شده: خیر؛ آمادگی اجرا: خیر/);
 assert.match(source,/هیچ اندازه، تعداد پیچ، ضخامت ورق یا جوش پیش‌فرض/);
});
test("knee detail UI exports the entered JSON without changing its geometry",()=>{
 assert.match(source,/sahroud-knee-connection-detail\.json/);
 assert.match(source,/Blob\(\[source\]/);
});

test("knee detail template assigns actual column and rafter roles",()=>{
 assert.match(source,/role:"column"/);
 assert.match(source,/role:"rafter"/);
});
test("knee detail validation cross-checks selected joint and actual member IDs",()=>{
 assert.match(source,/شناسه گره JSON با گره زانویی انتخاب‌شده/);
 assert.match(source,/با عضو واقعی مدل/);
});

test("knee detail UI exposes signed per-combination connection-frame demand mapping",()=>{
 assert.match(source,/btnKneeDetailMapDemand/);
 assert.match(source,/SahroudKneeConnectionDemandMapper\.map/);
 assert.match(source,/ظرفیت طراحی نشده؛ جمع نیروهای گره/);
});

test("knee demand report includes the physical transfer point column",()=>{
 assert.match(source,/نقطه انتقال جهانی \(m\)/);
 assert.match(source,/transferPoint\.globalCoordinatesM/);
});
test("knee detail editor button layout keeps all actions in one button grid",()=>{
 assert.match(source,/<div class='button-grid'><button id='btnKneeDetailTemplate'/);
 assert.match(source,/btnKneeDetailMapDemand[\s\S]*?انتقال تقاضای ترکیبات بار به دستگاه اتصال<\/button><\/div>/);
});
