"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {validateFootingDesignInput}=require("../js/foundation-design-input.js");
function sample(overrides={}){
 const actions={schema:"SAHROUD-FOUNDATION-ULS-LOCAL-ACTIONS-1.0",success:true,reactionSense:"on-structure",
 foundations:[{nodeId:"B1",cases:[{loadCase:"ULS-1",loadCaseLabel:"ترکیب نهایی ۱",sourceReference:"گزارش تحلیل صفحه ۲۰",
 FxLocalkN:0,FylocalkN:100,FzLocalkN:0,MxkNm:10,MykNm:0,MzkNm:15,NkN:100}]}]};
 return {schema:"SAHROUD-FOOTING-DESIGN-INPUT-1.0",foundationId:"F-01",nodeId:"B1",
 footing:{Bm:2,Lm:2,thicknessM:0.6},column:{widthX_m:0.4,widthZ_m:0.4,offsetX_m:0,offsetZ_m:0},
 pedestal:{enabled:true,widthX_m:0.6,widthZ_m:0.6,heightM:0.5},
 materials:{concreteFcMPa:25,rebarFyMPa:400,concreteSourceReference:"مشخصات فنی بتن C25",rebarSourceReference:"گواهی میلگرد A3"},
 cover:{bottomM:0.075,sideM:0.075},geometrySourceReference:"نقشه سازه S-01",ulsLocalActions:actions,...overrides};
}
test("validates geometry, materials and ULS action records without claiming structural design",()=>{
 const r=validateFootingDesignInput(sample());
 assert.equal(r.classification,"validated-input-only-not-a-structural-design");
 assert.equal(r.ulsActions.cases.length,1);
 assert.equal(r.geometry.pedestal.heightM,0.5);
});
test("requires exact schema and a mapped ULS action package",()=>{
 assert.throws(()=>validateFootingDesignInput({...sample(),schema:"wrong"}),/ساختار ورودی/);
 assert.throws(()=>validateFootingDesignInput({...sample(),ulsLocalActions:{schema:"SLS",success:true}}),/بسته تبدیل‌شده/);
});
test("rejects missing node, foundation ID and missing action records",()=>{
 assert.throws(()=>validateFootingDesignInput({...sample(),nodeId:"B2"}),/کنش محلی ULS/);
 assert.throws(()=>validateFootingDesignInput({...sample(),foundationId:""}),/شناسه پی/);
});
test("rejects zero and blank dimensions",()=>{
 assert.throws(()=>validateFootingDesignInput(sample({footing:{Bm:0,Lm:2,thicknessM:0.5}})),/بزرگ‌تر از صفر/);
 assert.throws(()=>validateFootingDesignInput(sample({footing:{Bm:"",Lm:2,thicknessM:0.5}})),/خالی/);
});
test("rejects column outside footing or invalid eccentricity",()=>{
 assert.throws(()=>validateFootingDesignInput(sample({column:{widthX_m:2.1,widthZ_m:0.4}})),/داخل پلان پی/);
 assert.throws(()=>validateFootingDesignInput(sample({column:{widthX_m:0.4,widthZ_m:0.4,offsetX_m:1}})),/داخل پلان پی/);
});
test("checks pedestal geometry and requires pedestal to enclose the column",()=>{
 assert.throws(()=>validateFootingDesignInput(sample({pedestal:{enabled:true,widthX_m:2.1,widthZ_m:0.5,heightM:0.5}})),/پدستال باید/);
 assert.throws(()=>validateFootingDesignInput(sample({pedestal:{enabled:true,widthX_m:0.3,widthZ_m:0.3,heightM:0.5}})),/کل مقطع ستون/);
});
test("requires traceable concrete and reinforcement strengths",()=>{
 assert.throws(()=>validateFootingDesignInput(sample({materials:{concreteFcMPa:25,rebarFyMPa:400,concreteSourceReference:"",rebarSourceReference:"A3"}})),/مرجع مستند/);
 assert.throws(()=>validateFootingDesignInput(sample({materials:{concreteFcMPa:0,rebarFyMPa:400,concreteSourceReference:"C25",rebarSourceReference:"A3"}})),/بزرگ‌تر از صفر/);
});
test("rejects cover incompatible with footing geometry",()=>{
 assert.throws(()=>validateFootingDesignInput(sample({cover:{bottomM:0.4,sideM:0.075}})),/پوشش بتن/);
});
test("validates optional proposed reinforcement without designing it",()=>{
 const r=validateFootingDesignInput(sample({proposedReinforcement:{bottomX:{diameterMm:16,count:8,spacingMm:200},bottomZ:{diameterMm:16,count:8},sourceReference:"پیشنهاد اولیه طراح"}}));
 assert.equal(r.proposedReinforcement.bottomX.count,8);
 assert.equal(r.proposedReinforcement.bottomZ.spacingMm,null);
});
test("rejects invalid proposed bar count and non-finite actions",()=>{
 assert.throws(()=>validateFootingDesignInput(sample({proposedReinforcement:{bottomX:{diameterMm:16,count:1}}})),/حداقل ۲/);
 const bad=sample();bad.ulsLocalActions.foundations[0].cases[0].NkN=NaN;
 assert.throws(()=>validateFootingDesignInput(bad),/عدد محدود/);
});
test("rejects missing ULS reaction sense and blank force values",()=>{
 const s=sample();s.ulsLocalActions.reactionSense="";
 assert.throws(()=>validateFootingDesignInput(s),/جهت تبدیل/);
 const b=sample();b.ulsLocalActions.foundations[0].cases[0].MxkNm="";
 assert.throws(()=>validateFootingDesignInput(b),/خالی/);
});
test("preserves explicit non-compression warning instead of silently assuming compression",()=>{
 const s=sample();s.ulsLocalActions.foundations[0].cases[0].NkN=-5;
 const r=validateFootingDesignInput(s);
 assert.ok(r.warnings.some(x=>x.includes("غیر فشاری")));
});
