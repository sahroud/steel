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

test("base plate bearing contact computes biaxial linear pressure and full contact",()=>{
 const r=api.checkBasePlateBearingContact({plateWidthMM:400,plateLengthMM:500,compressionKN:400,MxKNm:5,MzKNm:4,allowableBearingMPa:8,geometrySourceReference:"BP-01",sourceReference:"design basis",combinationDefinition:"ULS-1"});
 assert.equal(r.fullContact,true);
 assert.ok(r.qMaxMPa>r.averagePressureMPa);
 assert.ok(r.qMinMPa>=0);
 assert.equal(r.success,true);
});
test("base plate bearing contact blocks tension and excessive pressure",()=>{
 const base={plateWidthMM:300,plateLengthMM:400,compressionKN:100,MxKNm:20,MzKNm:0,allowableBearingMPa:5,geometrySourceReference:"BP-01",sourceReference:"basis",combinationDefinition:"ULS-1"};
 const r=api.checkBasePlateBearingContact(base);
 assert.equal(r.fullContact,false);
 assert.equal(r.status,"blocked-partial-contact-analysis-required");
 const high=api.checkBasePlateBearingContact({...base,MxKNm:0,allowableBearingMPa:0.2});
 assert.equal(high.fullContact,true);
 assert.equal(high.bearingPass,false);
});
test("base plate bearing contact requires explicit references and valid values",()=>{
 const base={plateWidthMM:300,plateLengthMM:400,compressionKN:100,MxKNm:0,MzKNm:0,allowableBearingMPa:5,geometrySourceReference:"BP-01",sourceReference:"basis",combinationDefinition:"ULS-1"};
 assert.throws(()=>api.checkBasePlateBearingContact({...base,compressionKN:0}),/مثبت/);
 assert.throws(()=>api.checkBasePlateBearingContact({...base,sourceReference:""}),/مرجع/);
 assert.throws(()=>api.checkBasePlateBearingContact({...base,combinationDefinition:""}),/ترکیب بار/);
});
