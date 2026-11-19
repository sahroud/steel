"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const knee=require("../js/knee-connection-geometry.js");
function section(extra={}){
 return {profile:"Built-up I",geometryType:"built-up-I",sectionPropertyFingerprint:"fp-1",
  geometryDimensionsMm:{topFlangeWidthMm:220,topFlangeThicknessMm:12,bottomFlangeWidthMm:200,bottomFlangeThicknessMm:12,webClearHeightMm:500,webThicknessMm:8,...extra}};
}
function model(overrides={}){
 return {geometry:{span:12},nodes:[{id:"E",x:0,y:6,z:0,kind:"eave"},{id:"C",x:0,y:0,z:0},{id:"R",x:6,y:7.2,z:0}],
  members:[{id:"COL",start:"C",end:"E",sectionKey:"column",sectionProperties:section(),...overrides.column},
   {id:"RAF",start:"E",end:"R",sectionKey:"rafter",axis:"transverse",frame:1,sectionProperties:section({topFlangeWidthMm:180}),...overrides.rafter}]};
}
test("knee extraction reads actual assigned column and rafter geometry dimensions",()=>{
 const k=knee.extract(model())[0];
 assert.equal(k.column.sectionGeometry.available,true);
 assert.equal(k.column.sectionGeometry.dimensionsMm.topFlangeWidthMm,220);
 assert.equal(k.rafter.sectionGeometry.dimensionsMm.topFlangeWidthMm,180);
 assert.equal(knee.check(k).valid,true);
});
test("missing section properties block knee geometry readiness",()=>{
 const m=model();delete m.members[0].sectionProperties;
 const k=knee.extract(m)[0];
 assert.equal(k.column.sectionGeometry.available,false);
 assert.equal(knee.check(k).valid,false);
});
test("unsupported profiles do not receive guessed built-up-I dimensions",()=>{
 const m=model();m.members[0].sectionProperties={...section(),geometryType:"catalog-profile"};
 const k=knee.extract(m)[0];
 assert.equal(k.column.sectionGeometry.status,"unsupported-or-unverified-profile");
 assert.equal(knee.check(k).valid,false);
});
test("invalid plate-girder dimensions are rejected",()=>{
 const s=knee.sectionGeometry({sectionProperties:section({webThicknessMm:700})});
 assert.equal(s.available,false);
 assert.match(s.issues.join(" "),/ارتفاع خالص جان|ضخامت جان/);
});
test("stale section fingerprints block geometry extraction",()=>{
 const m=model();m.members[0].sectionPropertyFingerprint="stale";
 const k=knee.extract(m)[0];
 assert.equal(k.column.sectionGeometry.status,"stale-section-fingerprint");
 assert.equal(knee.check(k).valid,false);
});
test("knee check never claims capacity design or execution readiness",()=>{
 const result=knee.check(knee.extract(model())[0]);
 assert.equal(result.capacityDesigned,false);
 assert.equal(result.executionReady,false);
 assert.equal(result.platePlaneVerified,false);
});
test("geometry sketch contains member axes only and no fabricated plate or bolt pattern",()=>{
 const drawing=knee.drawing(knee.extract(model())[0]);
 assert.equal(drawing.includes("<polygon"),false);
 assert.equal(drawing.includes("<circle"),false);
 assert.equal(drawing.includes("bolt"),false);
});
test("knee geometry self-test passes",()=>{
 const result=knee.selfTest();
 assert.equal(result.failed,0);
});

function analysisResult(){
 const axes={x:[0,1,0],y:[0,0,1],z:[1,0,0]};
 return {members:[{id:"COL",localAxes:axes},{id:"RAF",localAxes:axes}]};
}
test("knee geometry consumes solver local axes by member id without inferring section roll",()=>{
 const k=knee.extract(model(),analysisResult())[0];
 assert.equal(k.column.solverAxes.available,true);
 assert.deepEqual(k.column.solverAxes.axes,{x:[0,1,0],y:[0,0,1],z:[1,0,0]});
 assert.equal(k.rafter.solverAxes.source,"analysisResult.members.localAxes");
 assert.equal(knee.check(k).capacityDesigned,false);
});
test("missing solver result axes remain explicitly unavailable",()=>{
 const k=knee.extract(model())[0];
 assert.equal(k.column.solverAxes.available,false);
 assert.equal(k.column.solverAxes.status,"solver-axes-missing");
});
test("invalid solver axes are rejected rather than used for section geometry",()=>{
 const result={members:[{id:"COL",localAxes:{x:[1,0,0],y:[1,0,0],z:[0,0,1]}},{id:"RAF",localAxes:{x:[0,1,0],y:[0,0,1],z:[1,0,0]}}]};
 const k=knee.extract(model(),result)[0];
 assert.equal(k.column.solverAxes.available,false);
 assert.equal(k.column.solverAxes.status,"solver-axes-invalid");
 assert.equal(knee.check(k).capacityDesigned,false);
});
