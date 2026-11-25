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

test("anchor steel capacity checks per-anchor tension and resultant shear independently",()=>{
 const r=api.checkAnchorSteelCapacity({geometrySourceReference:"BP-01",capacitySourceReference:"anchor certificate/design basis",combinationDefinition:"ULS-1",
  anchors:[{id:"A1",tensionDemandKN:40,shearXDemandKN:3,shearZDemandKN:4,designTensionCapacityKN:50,designShearCapacityKN:10}]});
 assert.equal(r.success,true); assert.equal(r.anchors[0].resultantShearDemandKN,5);
 assert.equal(r.anchors[0].tensionUtilization,0.8); assert.equal(r.interactionChecked,false);
});
test("anchor steel capacity flags tension and shear failures independently",()=>{
 const base={geometrySourceReference:"BP-01",capacitySourceReference:"cert",combinationDefinition:"ULS-2",
  anchors:[{id:"A1",tensionDemandKN:60,shearXDemandKN:8,shearZDemandKN:6,designTensionCapacityKN:50,designShearCapacityKN:10}]};
 const r=api.checkAnchorSteelCapacity(base);
 assert.equal(r.success,false); assert.equal(r.anchors[0].tensionPass,false); assert.equal(r.anchors[0].shearPass,true);
 assert.throws(()=>api.checkAnchorSteelCapacity({...base,capacitySourceReference:""}),/مرجع ظرفیت/);
 assert.throws(()=>api.checkAnchorSteelCapacity({...base,anchors:[{...base.anchors[0],designShearCapacityKN:0}]}),/مثبت/);
});

test("concrete anchor failure screening compares all four supplied design capacities",()=>{
 const r=api.checkConcreteAnchorFailure({geometrySourceReference:"BP-01 edge distances and embedment",capacitySourceReference:"approved anchor design calculation",combinationDefinition:"ULS-3",
  anchors:[{id:"A1",tensionDemandKN:30,resultantShearDemandKN:12,concreteBreakoutTensionCapacityKN:50,pulloutTensionCapacityKN:45,concreteEdgeShearCapacityKN:20,pryoutShearCapacityKN:18}]});
 assert.equal(r.success,true); assert.equal(r.anchors[0].checks.length,4);
 assert.equal(r.anchors[0].governingMode.mode,"pullout-tension");
});
test("concrete anchor failure screening flags governing concrete mode and rejects missing capacities",()=>{
 const base={geometrySourceReference:"BP-01",capacitySourceReference:"design calc",combinationDefinition:"ULS-4",
  anchors:[{id:"A1",tensionDemandKN:40,resultantShearDemandKN:15,concreteBreakoutTensionCapacityKN:30,pulloutTensionCapacityKN:50,concreteEdgeShearCapacityKN:10,pryoutShearCapacityKN:20}]};
 const r=api.checkConcreteAnchorFailure(base);
 assert.equal(r.success,false); assert.equal(r.anchors[0].governingMode.mode,"concrete-edge-shear");
 assert.throws(()=>api.checkConcreteAnchorFailure({...base,anchors:[{...base.anchors[0],pryoutShearCapacityKN:0}]}),/مثبت/);
 assert.throws(()=>api.checkConcreteAnchorFailure({...base,geometrySourceReference:""}),/مرجع هندسه/);
});

test("anchor steel interaction evaluates explicitly supplied interaction envelope",()=>{
 const r=api.checkAnchorSteelInteraction({geometrySourceReference:"BP-01",capacitySourceReference:"anchor design calc",interactionRuleReference:"project-approved interaction rule",combinationDefinition:"ULS-5",interactionLimit:1,tensionExponent:1,shearExponent:1,
  anchors:[{id:"A1",tensionDemandKN:30,shearXDemandKN:4,shearZDemandKN:3,designTensionCapacityKN:60,designShearCapacityKN:10}]});
 assert.equal(r.success,true); assert.equal(r.anchors[0].interactionValue,1);
});
test("anchor steel interaction rejects exceeded envelope and missing rule provenance",()=>{
 const base={geometrySourceReference:"BP-01",capacitySourceReference:"calc",interactionRuleReference:"rule",combinationDefinition:"ULS-6",interactionLimit:1,tensionExponent:1,shearExponent:1,
  anchors:[{id:"A1",tensionDemandKN:50,shearXDemandKN:8,shearZDemandKN:6,designTensionCapacityKN:60,designShearCapacityKN:10}]};
 assert.equal(api.checkAnchorSteelInteraction(base).success,false);
 assert.throws(()=>api.checkAnchorSteelInteraction({...base,interactionRuleReference:""}),/اندرکنش/);
 assert.throws(()=>api.checkAnchorSteelInteraction({...base,interactionLimit:0}),/مثبت/);
});

test("anchor group screening compares total group demands with externally derived group capacities",()=>{
 const r=api.checkAnchorGroupCapacity({geometrySourceReference:"BP-02 anchor layout",groupCapacitySourceReference:"approved group calculation including overlapping cones",combinationDefinition:"ULS-G1",anchorCount:4,groupTensionDemandKN:120,groupTensionBreakoutDesignCapacityKN:180,groupPulloutDesignCapacityKN:160,groupShearDemandKN:40,groupEdgeShearDesignCapacityKN:70,groupPryoutDesignCapacityKN:60});
 assert.equal(r.success,true);assert.equal(r.checks.length,4);assert.equal(r.checks[0].utilization,120/180);
});
test("anchor group screening rejects failed capacities and missing group provenance",()=>{
 const base={geometrySourceReference:"BP-02",groupCapacitySourceReference:"group calc",combinationDefinition:"ULS-G2",anchorCount:4,groupTensionDemandKN:120,groupTensionBreakoutDesignCapacityKN:100,groupPulloutDesignCapacityKN:160,groupShearDemandKN:40,groupEdgeShearDesignCapacityKN:70,groupPryoutDesignCapacityKN:60};
 assert.equal(api.checkAnchorGroupCapacity(base).success,false);
 assert.throws(()=>api.checkAnchorGroupCapacity({...base,groupCapacitySourceReference:""}),/مرجع/);
 assert.throws(()=>api.checkAnchorGroupCapacity({...base,anchorCount:1}),/حداقل ۲/);
});
