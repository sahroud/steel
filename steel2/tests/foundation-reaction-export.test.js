"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {exportSupportReactions}=require("../js/foundation-reaction-export.js");

const nodes=[{id:"B1",x:0,y:0,z:0},{id:"B2",x:6,y:0,z:0}];
const supports=[{nodeId:"B1",fixedDofs:[0,1,2,3,4,5]},{nodeId:"B2",fixedDofs:[0,1,2]}];

test("exports every base support with global reactions converted from N and Nm",()=>{
 const out=exportSupportReactions({nodes,supports,reactions:[{nodeId:"B1",values:[10000,-20000,30000,4000,5000,-6000]},{nodeId:"B2",values:[0,0,0,0,0,0]}],
  loadCase:"dead",loadCaseLabel:"بار مرده",equilibrium:{ok:true}});
 assert.equal(out.supports.length,2);
 assert.deepEqual([out.supports[0].FxkN,out.supports[0].FykN,out.supports[0].FzkN],[10,-20,30]);
 assert.deepEqual([out.supports[0].MxkNm,out.supports[0].MykNm,out.supports[0].MzkNm],[4,5,-6]);
 assert.equal(out.supports[1].FykN,0);
 assert.equal(out.solverEquilibriumOK,true);
});

test("retains support coordinates and fixed degrees of freedom",()=>{
 const out=exportSupportReactions({nodes,supports,reactions:[],loadCase:"live"});
 assert.deepEqual(out.supports[1].coordinatesM,{x:6,y:0,z:0});
 assert.deepEqual(out.supports[1].fixedDofs,[0,1,2]);
});

test("rejects missing supports, missing geometry, and absent load case",()=>{
 assert.throws(()=>exportSupportReactions({nodes,supports:[],loadCase:"D"}),/تکیه‌گاه/);
 assert.throws(()=>exportSupportReactions({nodes:[],supports,loadCase:"D"}),/گره‌های مدل/);
 assert.throws(()=>exportSupportReactions({nodes,supports,loadCase:""}),/شناسه حالت بار/);
});

test("rejects support identifiers not found in model geometry",()=>{
 assert.throws(()=>exportSupportReactions({nodes,supports:[{nodeId:"UNKNOWN",fixedDofs:[0,1,2]}],loadCase:"D"}),/یافت نشد/);
});

test("marks output as one analysis case, not an approved SLS envelope",()=>{
 const out=exportSupportReactions({nodes,supports,reactions:[],loadCase:"combo0",loadCaseLabel:"ULS-1"});
 assert.match(out.limitations[0],/ترکیب SLS/);
 assert.match(out.sourceReference,/حل‌گر سه‌بعدی/);
});

test("does not silently replace a missing support reaction with a zero vector",()=>{
 assert.throws(()=>exportSupportReactions({nodes,supports,reactions:[{nodeId:"B1",values:[0,0,0,0,0,0]}],loadCase:"D"}),/مقدار صفر به‌صورت خودکار/);
});
test("rejects duplicate support ids, duplicate reaction ids and non-finite coordinates",()=>{
 assert.throws(()=>exportSupportReactions({nodes,supports:[supports[0],supports[0]],reactions:[{nodeId:"B1",values:[0,0,0,0,0,0]}],loadCase:"D"}),/خالی یا تکراری/);
 assert.throws(()=>exportSupportReactions({nodes,supports,reactions:[{nodeId:"B1",values:[0,0,0,0,0,0]},{nodeId:"B1",values:[0,0,0,0,0,0]},{nodeId:"B2",values:[0,0,0,0,0,0]}],loadCase:"D"}),/واکنش تکراری/);
 assert.throws(()=>exportSupportReactions({nodes:[{id:"B1",x:NaN,y:0,z:0}],supports:[supports[0]],reactions:[{nodeId:"B1",values:[0,0,0,0,0,0]}],loadCase:"D"}),/مختصات گره/);
});
