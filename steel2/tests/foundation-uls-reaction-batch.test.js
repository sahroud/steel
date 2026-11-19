"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {collectUlsReactionCases}=require("../js/foundation-uls-reaction-batch.js");
function payload(overrides={}){
 const base={loadCase:"ULS-1",loadCaseLabel:"ترکیب نهایی ۱",classification:"ULS",
  solverEquilibriumOK:true,sourceReference:"گزارش مصوب ترکیبات نهایی صفحه ۸",
  supports:[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},fixedDofs:[0,1,2],
   FxkN:10,FykN:100,FzkN:5,MxkNm:2,MykNm:3,MzkNm:4}]};
 return {cases:[{...base,...overrides}]};
}
test("accepts explicit equilibrium-verified ULS cases and preserves concurrent six-component vectors",()=>{
 const b=collectUlsReactionCases({cases:[payload().cases[0],{...payload().cases[0],loadCase:"ULS-2",loadCaseLabel:"ترکیب نهایی ۲",sourceReference:"گزارش مصوب صفحه ۹",
  supports:[{...payload().cases[0].supports[0],FxkN:-20,MzkNm:12}]}]});
 assert.equal(b.schema,"SAHROUD-FOUNDATION-ULS-REACTION-BATCH-1.0");
 assert.equal(b.caseCount,2);assert.equal(b.supportCount,1);
 assert.deepEqual(b.foundations[0].cases.map(x=>[x.FxkN,x.FykN,x.FzkN,x.MxkNm,x.MykNm,x.MzkNm]),
  [[10,100,5,2,3,4],[-20,100,5,2,3,12]]);
});
test("rejects SLS, missing equilibrium, missing sources and duplicate cases",()=>{
 assert.throws(()=>collectUlsReactionCases(payload({classification:"SLS"})),/ULS/);
 assert.throws(()=>collectUlsReactionCases(payload({solverEquilibriumOK:false})),/تعادل حل‌گر/);
 assert.throws(()=>collectUlsReactionCases(payload({sourceReference:""})),/مرجع مستند/);
 const p=payload();p.cases.push({...p.cases[0]});
 assert.throws(()=>collectUlsReactionCases(p),/یکتا/);
});
test("rejects inconsistent supports and non-finite force or moment values",()=>{
 const p=payload();p.cases.push({...payload().cases[0],loadCase:"ULS-2",supports:[]});
 assert.throws(()=>collectUlsReactionCases(p),/خالی/);
 assert.throws(()=>collectUlsReactionCases(payload({supports:[{...payload().cases[0].supports[0],MxkNm:"NaN"}]})),/عدد محدود/);
});

test("rejects null or blank ULS force and moment components instead of coercing them to zero",()=>{
 const n=payload();n.cases[0].supports[0].FykN=null;
 assert.throws(()=>collectUlsReactionCases(n),/نباید خالی باشد/);
 const b=payload();b.cases[0].supports[0].MzkNm="";
 assert.throws(()=>collectUlsReactionCases(b),/نباید خالی باشد/);
});
