"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const api=require("../js/base-plate-check.js");

test("base plate strip check computes moment and plastic design resistance",()=>{
 const r=api.checkBasePlateCantileverBending({
  plateThicknessMM:20,plateFyMPa:240,phi:0.9,pryingFactor:1.5,
  geometrySourceReference:"نقشه آزمایشی صفحه‌ستون",
  anchors:[{id:"A1",tensionDemandKN:40,projectionMM:80,effectiveWidthMM:100}]
 });
 assert.equal(r.anchors[0].pryingAmplifiedTensionKN,60);
 assert.equal(r.anchors[0].momentDemandNmmPerMM,48000);
 assert.equal(r.anchors[0].designMomentCapacityNmmPerMM,21600);
 assert.equal(r.success,false);
});

test("base plate strip check passes a low demand",()=>{
 const r=api.checkBasePlateCantileverBending({
  plateThicknessMM:25,plateFyMPa:240,pryingFactor:1,geometrySourceReference:"drawing",
  anchors:[{id:"A1",tensionDemandKN:10,projectionMM:40,effectiveWidthMM:120}]
 });
 assert.equal(r.success,true);
});

test("base plate strip check rejects missing geometry, duplicate IDs and invalid dimensions",()=>{
 const base={plateThicknessMM:20,plateFyMPa:240,pryingFactor:1,geometrySourceReference:"drawing",
  anchors:[{id:"A1",tensionDemandKN:10,projectionMM:40,effectiveWidthMM:100}]};
 assert.throws(()=>api.checkBasePlateCantileverBending({...base,geometrySourceReference:""}),/مرجع/);
 assert.throws(()=>api.checkBasePlateCantileverBending({...base,anchors:[...base.anchors,{...base.anchors[0]}]}),/یکتا/);
 assert.throws(()=>api.checkBasePlateCantileverBending({...base,plateThicknessMM:0}),/معتبر/);
 assert.throws(()=>api.checkBasePlateCantileverBending({...base,pryingFactor:0.8}),/حداقل ۱/);
 assert.throws(()=>api.checkBasePlateCantileverBending({...base,anchors:[{id:"A1",tensionDemandKN:-1,projectionMM:40,effectiveWidthMM:100}]}),/منفی/);
});

test("base plate strip checker is exported for browser and Node consumers",()=>{
 assert.equal(typeof api.checkBasePlateCantileverBending,"function");
});

test("base plate strip check defaults prying factor to 1 when omitted",()=>{
 const r=api.checkBasePlateCantileverBending({
  plateThicknessMM:20,plateFyMPa:240,geometrySourceReference:"drawing",
  anchors:[{id:"A1",tensionDemandKN:10,projectionMM:40,effectiveWidthMM:100}]
 });
 assert.equal(r.pryingFactor,1);
 assert.equal(r.anchors[0].pryingAmplifiedTensionKN,10);
});
