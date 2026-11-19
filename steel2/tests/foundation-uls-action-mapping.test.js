"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {collectUlsReactionCases}=require("../js/foundation-uls-reaction-batch.js");
const {mapUlsReactionBatchToFootingActions}=require("../js/foundation-uls-action-mapping.js");
const batch=()=>collectUlsReactionCases({cases:[{loadCase:"ULS-1",loadCaseLabel:"ULS",classification:"ULS",
 solverEquilibriumOK:true,sourceReference:"Approved ULS report p.4",
 supports:[{nodeId:"B1",coordinatesM:{x:2,y:0,z:0},fixedDofs:[0,1,2],
 FxkN:0,FykN:100,FzkN:0,MxkNm:0,MykNm:0,MzkNm:0}]}]});
const footing={nodeId:"B1",footingCentroidGlobalM:{x:1,y:0,z:0},
 localAxes:{x:{x:1,y:0,z:0},y:{x:0,y:1,z:0},z:{x:0,y:0,z:1}},
 verticalLocalAxis:"y",compressionSign:-1};
test("maps ULS support reactions to local foundation actions and shifts moment to footing centroid",()=>{
 const out=mapUlsReactionBatchToFootingActions({batch:batch(),reactionSense:"on-structure",foundations:[footing]});
 assert.equal(out.schema,"SAHROUD-FOUNDATION-LOCAL-ACTIONS-1.0");
 assert.equal(out.sourceSchema,"SAHROUD-FOUNDATION-ULS-REACTION-BATCH-1.0");
 assert.equal(out.foundations[0].cases[0].NkN,100);
 assert.equal(out.foundations[0].cases[0].MzkNm,-100);
});
test("rejects non-ULS batch, missing reaction sense and incomplete footing geometry",()=>{
 assert.throws(()=>mapUlsReactionBatchToFootingActions({batch:{schema:"SAHROUD-FOUNDATION-SLS-REACTION-BATCH-1.0",success:true},reactionSense:"on-structure",foundations:[footing]}),/بسته معتبر واکنش‌های ULS/);
 assert.throws(()=>mapUlsReactionBatchToFootingActions({batch:batch(),foundations:[footing]}),/جهت واکنش/);
 assert.throws(()=>mapUlsReactionBatchToFootingActions({batch:batch(),reactionSense:"on-structure",foundations:[]}),/مرکز پی/);
});
