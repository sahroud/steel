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
 assert.match(source,/btnKneeDetailMapDemand[\s\S]*?انتقال تقاضای ترکیبات بار به دستگاه اتصال<\/button>[\s\S]*?btnKneeDetailCollision[\s\S]*?ممیزی برخورد سه‌بعدی ورق‌ها<\/button><\/div>/);
});

test("knee detail UI exports global 3D geometry through the validated geometry builder",()=>{
 assert.match(source,/btnKneeDetailExportGlobal/);
 assert.match(source,/SahroudKneeConnectionDetail\.buildGlobalGeometry/);
 assert.match(source,/sahroud-knee-connection-global-geometry\.json/);
});
test("all knee detail actions are inside one balanced button grid",()=>{
 const start=source.indexOf("<div class='button-grid'>");
 const end=source.indexOf("</div>",start);
 const block=source.slice(start,end);
 assert.ok(block.includes("btnKneeDetailTemplate"));
 assert.ok(block.includes("btnKneeDetailMapDemand"));
 assert.ok(block.includes("btnKneeDetailExportGlobal"));
});

test("knee detail UI exposes the SAT plate collision audit and explicit tolerance",()=>{
 assert.match(source,/btnKneeDetailCollision/);
 assert.match(source,/SahroudKneeConnectionCollision\.audit/);
 assert.match(source,/kneeCollisionTolerance/);
 assert.match(source,/این گزارش فقط ممیزی هندسی است/);
});
test("collision module loads before the knee detail UI",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const collision=html.indexOf("js/knee-connection-collision.js");
 const ui=html.indexOf("js/knee-connection-detail-ui.js");
 assert.ok(collision>=0&&ui>collision);
});

test("capacity module loads before the knee detail UI",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
 const detail=html.indexOf("js/knee-connection-detail.js");
 const capacity=html.indexOf("js/knee-connection-capacity.js");
 const ui=html.indexOf("js/knee-connection-detail-ui.js");
 assert.ok(detail>=0&&capacity>detail&&ui>capacity);
});
test("knee detail UI exposes code-referenced bolt and plate capacity calculations without approving the connection",()=>{
 assert.match(source,/btnKneeCapacityTemplate/);
 assert.match(source,/btnKneeCapacityRun/);
 assert.match(source,/SahroudKneeConnectionCapacity\.calculate/);
 assert.match(source,/تأیید نهایی: خیر؛ آمادگی اجرا: خیر/);
 assert.match(source,/ظرفیت‌های محاسبه‌شده به معنی تأیید اتصال نیستند/);
});

test("knee detail UI displays the limited fillet weld metal capacity checks",()=>{
 assert.match(source,/report\.weldChecks\.forEach/);
 assert.ok(source.includes("کشش/فشار موازی محور جوش"));
 assert.match(source,/weldDemandDistributionVerifiedByEngineer/);
});

test("knee detail UI runs and displays the elastic weld-group demand report",()=>{
 assert.match(source,/btnKneeWeldDemand/);
 assert.match(source,/SahroudKneeWeldDemand\.analyze/);
 assert.match(source,/lastKneeMappedDemand=mapped/);
 assert.match(source,/qmax \(kN\/mm\)/);
 assert.match(source,/ظرفیت و قبولی اتصال محاسبه نشده است/);
});


test("knee weld demand is invalidated when a new 3D combination analysis arrives",()=>{
 assert.match(source,/lastKneeMappedDemand=null/);
 assert.match(source,/const current=selectedKnee\(\)/);
 assert.match(source,/تقاضای قدیمی/);
});

test("knee detail UI exposes Part 10 fillet weld geometry checks",()=>{
 assert.match(source,/btnKneeWeldDetailCheck/);
 assert.match(source,/SahroudKneeWeldDetailCheck\.assess/);
 assert.match(source,/report\.codeBasis\.clause/);
 assert.match(source,/ظرفیت جوش و فلز پایه یا تأیید اجرایی را نشان نمی‌دهد/);
});
