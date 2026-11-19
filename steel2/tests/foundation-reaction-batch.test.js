"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {collectSlsReactionCases}=require("../js/foundation-reaction-batch.js");
const supports=[{nodeId:"B1",coordinatesM:{x:0,y:0,z:0},fixedDofs:[0,1,2],FxkN:1,FykN:100,FzkN:2,MxkNm:3,MykNm:0,MzkNm:4},
 {nodeId:"B2",coordinatesM:{x:6,y:0,z:0},fixedDofs:[0,1,2],FxkN:-1,FykN:90,FzkN:-2,MxkNm:-3,MykNm:0,MzkNm:-4}];
const make=(id,label)=>({loadCase:id,loadCaseLabel:label,classification:"SLS",solverEquilibriumOK:true,
 sourceReference:"گزارش ترکیبات مصوب S-01 بند ۴",supports});
test("collects complete reaction vectors separately for every SLS case and every support",()=>{
 const out=collectSlsReactionCases({cases:[make("SLS-1","بهره‌برداری ۱"),make("SLS-2","بهره‌برداری ۲")]});
 assert.equal(out.caseCount,2);assert.equal(out.supportCount,2);
 assert.equal(out.foundations[0].cases.length,2);
 assert.equal(out.foundations[0].cases[1].loadCase,"SLS-2");
 assert.equal(out.foundations[0].cases[0].FykN,100);
 assert.match(out.signConvention,/بدون تغییر/);
});
test("rejects ULS or missing classification even when label contains SLS",()=>{
 assert.throws(()=>collectSlsReactionCases({cases:[{...make("U1","SLS label"),classification:"ULS"}]}),/صریحاً به‌عنوان SLS/);
 assert.throws(()=>collectSlsReactionCases({cases:[{...make("U2","SLS-2"),classification:""}]}),/صریحاً به‌عنوان SLS/);
});
test("rejects failed equilibrium and missing source reference",()=>{
 assert.throws(()=>collectSlsReactionCases({cases:[{...make("S1","SLS-1"),solverEquilibriumOK:false}]}),/تعادل حل‌گر/);
 assert.throws(()=>collectSlsReactionCases({cases:[{...make("S2","SLS-2"),sourceReference:""}]}),/مرجع مستند/);
});
test("rejects missing, duplicate, or geometrically changed supports",()=>{
 assert.throws(()=>collectSlsReactionCases({cases:[{...make("S1","SLS-1"),supports:[]}]}),/خالی است/);
 assert.throws(()=>collectSlsReactionCases({cases:[make("S1","SLS-1"),{...make("S2","SLS-2"),supports:[supports[0]]}]}),/مختصات پایه‌ها/);
 assert.throws(()=>collectSlsReactionCases({cases:[make("S1","SLS-1"),{...make("S2","SLS-2"),supports:supports.map((x,i)=>i?x:{...x,coordinatesM:{x:0,y:0,z:1}})}]}),/مختصات پایه‌ها/);
});
test("rejects duplicate cases and non-finite support components",()=>{
 assert.throws(()=>collectSlsReactionCases({cases:[make("S1","SLS-1"),make("S1","SLS-1b")]}),/یکتا/);
 assert.throws(()=>collectSlsReactionCases({cases:[{...make("S2","SLS-2"),supports:[{...supports[0],FykN:NaN},supports[1]]}]}),/عدد محدود/);
});

test("rejects null or blank force and moment components instead of coercing them to zero",()=>{
 const nullCase=make("SLS-null","SLS null");
 nullCase.supports=[{...supports[0],FykN:null},supports[1]];
 assert.throws(()=>collectSlsReactionCases({cases:[nullCase]}),/نباید خالی باشد/);
 const blankCase=make("SLS-blank","SLS blank");
 blankCase.supports=[{...supports[0],MzkNm:""},supports[1]];
 assert.throws(()=>collectSlsReactionCases({cases:[blankCase]}),/نباید خالی باشد/);
});
