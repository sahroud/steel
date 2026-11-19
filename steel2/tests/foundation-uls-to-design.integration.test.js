"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {collectUlsReactionCases}=require("../js/foundation-uls-reaction-batch.js");
const {mapUlsReactionBatchToFootingActions}=require("../js/foundation-uls-action-mapping.js");
const {validateFootingDesignInput}=require("../js/foundation-design-input.js");

function endToEndInput(){
 const batch=collectUlsReactionCases({cases:[{
  loadCase:"ULS-1",loadCaseLabel:"ترکیب نهایی مستند",classification:"ULS",
  solverEquilibriumOK:true,sourceReference:"گزارش تحلیل تأییدشده، صفحه ۱۲",
  supports:[{nodeId:"B1",coordinatesM:{x:2,y:0,z:0},fixedDofs:[0,1,2],
   FxkN:12,FykN:100,FzkN:5,MxkNm:3,MykNm:4,MzkNm:6}]
 }]});
 const mapped=mapUlsReactionBatchToFootingActions({batch,reactionSense:"on-structure",
  foundations:[{nodeId:"B1",footingCentroidGlobalM:{x:1,y:0,z:0},
   localAxes:{x:{x:1,y:0,z:0},y:{x:0,y:1,z:0},z:{x:0,y:0,z:1}},
   verticalLocalAxis:"y",compressionSign:-1}]});
 return {schema:"SAHROUD-FOOTING-DESIGN-INPUT-1.0",foundationId:"F-01",nodeId:"B1",
  footing:{Bm:2,Lm:2,thicknessM:0.6},
  column:{widthX_m:0.4,widthZ_m:0.4,offsetX_m:0,offsetZ_m:0},
  pedestal:{enabled:true,widthX_m:0.6,widthZ_m:0.6,heightM:0.5},
  materials:{concreteFcMPa:25,rebarFyMPa:400,
   concreteSourceReference:"مشخصات فنی بتن C25",rebarSourceReference:"گواهی میلگرد A3"},
  cover:{bottomM:0.075,sideM:0.075},geometrySourceReference:"نقشه سازه S-01",
  ulsLocalActions:mapped};
}

test("runs ULS batch collection, local-axis mapping and footing-input validation end to end",()=>{
 const input=endToEndInput();
 const result=validateFootingDesignInput(input);
 assert.equal(result.classification,"validated-input-only-not-a-structural-design");
 assert.equal(result.ulsActions.sourceSchema,"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0");
 assert.equal(result.ulsActions.reactionSense,"on-structure");
 assert.equal(result.ulsActions.cases[0].NkN,100);
 assert.equal(result.ulsActions.cases[0].FxLocalkN,-12);
 assert.equal(result.ulsActions.cases[0].FzLocalkN,-5);
 assert.equal(result.ulsActions.cases[0].MzkNm,-106);
 assert.match(result.ulsActions.cases[0].sourceReference,/صفحه ۱۲/);
 assert.ok(result.requiredNextChecks.includes("خمش دوطرفه و تعیین آرماتور لازم در هر راستا"));
});

test("rejects an end-to-end package when the selected footing node is absent",()=>{
 const input=endToEndInput();
 input.nodeId="B-UNKNOWN";
 assert.throws(()=>validateFootingDesignInput(input),/کنش محلی ULS/);
});

test("keeps the output explicitly classified as input validation, not footing design",()=>{
 const result=validateFootingDesignInput(endToEndInput());
 assert.equal(result.classification,"validated-input-only-not-a-structural-design");
 assert.ok(result.limitations.some(x=>x.includes("هیچ کنترل مقاومت یا طراحی آرماتور")));
});
