"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {collectSlsReactionCases}=require("../js/foundation-reaction-batch.js");
const {mapSlsReactionBatchToFootingActions}=require("../js/foundation-action-mapping.js");

function batch(overrides={}){
 const support={nodeId:"B1",coordinatesM:{x:2,y:0,z:0},fixedDofs:[0,1,2],
  FxkN:0,FykN:100,FzkN:0,MxkNm:0,MykNm:0,MzkNm:0,...(overrides.support||{})};
 return collectSlsReactionCases({cases:[{
  loadCase:"SLS-1",loadCaseLabel:"SLS service",classification:"SLS",
  solverEquilibriumOK:true,sourceReference:"Approved SLS report p.4",supports:[support]
 }]});
}
const footing=(overrides={})=>({
 nodeId:"B1",footingCentroidGlobalM:{x:1,y:0,z:0},
 localAxes:{x:{x:1,y:0,z:0},y:{x:0,y:1,z:0},z:{x:0,y:0,z:1}},
 verticalLocalAxis:"y",compressionSign:-1,...overrides
});

test("maps solver support reaction to opposite foundation action and shifts moment to footing centroid",()=>{
 const out=mapSlsReactionBatchToFootingActions({batch:batch(),reactionSense:"on-structure",foundations:[footing()]});
 const c=out.foundations[0].cases[0];
 assert.equal(c.NkN,100);
 assert.equal(c.FylocalkN,-100);
 assert.equal(c.MzkNm,-100);
 assert.equal(c.MxkNm,0);
 assert.equal(out.schema,"SAHROUD-FOUNDATION-LOCAL-ACTIONS-1.0");
});

test("does not reverse actions when input explicitly represents loads on the foundation",()=>{
 const out=mapSlsReactionBatchToFootingActions({
  batch:batch({support:{FykN:-100}}),reactionSense:"on-foundation",foundations:[footing()]
 });
 assert.equal(out.foundations[0].cases[0].NkN,100);
 assert.equal(out.reactionSense,"on-foundation");
});

test("rotates global vectors into an explicitly supplied right-handed local basis",()=>{
 const axes={x:{x:0,y:0,z:1},y:{x:0,y:1,z:0},z:{x:-1,y:0,z:0}};
 const out=mapSlsReactionBatchToFootingActions({
  batch:batch({support:{FxkN:10,FykN:0,FzkN:0}}),reactionSense:"on-foundation",
  foundations:[footing({footingCentroidGlobalM:{x:2,y:0,z:0},localAxes:axes})]
 });
 const c=out.foundations[0].cases[0];
 assert.equal(c.FzLocalkN,-10);
 assert.equal(c.FxLocalkN,0);
});

test("requires explicit reaction sense, complete footing mapping and right-handed orthonormal axes",()=>{
 assert.throws(()=>mapSlsReactionBatchToFootingActions({batch:batch(),foundations:[footing()]}),/جهت واکنش/);
 assert.throws(()=>mapSlsReactionBatchToFootingActions({batch:batch(),reactionSense:"on-structure",foundations:[]}),/مرکز پی/);
 assert.throws(()=>mapSlsReactionBatchToFootingActions({batch:batch(),reactionSense:"on-structure",foundations:[footing({localAxes:{
  x:{x:1,y:0,z:0},y:{x:1,y:0,z:0},z:{x:0,y:0,z:1}
 }})]}),/بر هم عمود/);
 assert.throws(()=>mapSlsReactionBatchToFootingActions({batch:batch(),reactionSense:"on-structure",foundations:[footing({localAxes:{
  x:{x:1,y:0,z:0},y:{x:0,y:0,z:1},z:{x:0,y:1,z:0}
 }})]}),/راست‌گرد/);
});

test("requires the soil-check axis contract and explicit compression sign",()=>{
 assert.throws(()=>mapSlsReactionBatchToFootingActions({
  batch:batch(),reactionSense:"on-structure",foundations:[footing({verticalLocalAxis:"z"})]
 }),/محور قائم محلی باید y/);
 assert.throws(()=>mapSlsReactionBatchToFootingActions({
  batch:batch(),reactionSense:"on-structure",foundations:[footing({compressionSign:0})]
 }),/فقط \+1 یا -1/);
});

test("rejects a missing or extra footing mapping instead of silently dropping supports",()=>{
 assert.throws(()=>mapSlsReactionBatchToFootingActions({
  batch:batch(),reactionSense:"on-structure",foundations:[footing({nodeId:"B2"})]
 }),/تمام و فقط پایه‌ها/);
});
