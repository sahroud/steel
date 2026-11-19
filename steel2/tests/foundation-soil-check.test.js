"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const soil=require("../js/foundation-soil-check.js");
const base={
 soil:{soilType:"II",allowableBearingKPa:300,allowableBearingBasis:"gross",sourceReference:"Geotech report G-01 p.12"},
 Bm:2,Lm:2,footingLoads:{thicknessM:0.5,soilCoverAboveFootingM:0.5,concreteUnitWeightKNm3:24,soilUnitWeightKNm3:18}
};
test("bearing check adds centered footing and soil-cover weights and evaluates biaxial SLS pressure",()=>{
 const r=soil.checkRectangularFooting({...base,cases:[{name:"SLS-1",sourceReference:"Structural reaction report R-01 p.4",NkN:1000,MxkNm:20,MzkNm:15}]});
 const x=r.results[0];
 assert.equal(x.areaM2,4);
 assert.equal(x.footingWeightKN,48);
 assert.equal(x.soilCoverWeightKN,36);
 assert.equal(x.NkN,1084);
 assert.equal(x.eccentricityX_m,15/1084);
 assert.equal(x.eccentricityZ_m,20/1084);
 assert.equal(x.qAverageGrossKPa,271);
 assert.ok(Math.abs(x.qMaxGrossKPa-297.25)<1e-10);
 assert.ok(Math.abs(x.qMinGrossKPa-244.75)<1e-10);
 assert.ok(Math.abs(x.qMaxNetKPa-279.25)<1e-10);
 assert.ok(Math.abs(x.qMinNetKPa-226.75)<1e-10);
 assert.equal(x.bearingPass,true);
});
test("net allowable pressure is compared with net pressure after subtracting initial overburden",()=>{
 const r=soil.checkRectangularFooting({...base,soil:{...base.soil,allowableBearingKPa:280,allowableBearingBasis:"net"},
  cases:[{name:"SLS-1",sourceReference:"Reaction report p.4",NkN:1000,MxkNm:20,MzkNm:15}]});
 assert.equal(r.results[0].qMaxCheckedKPa,r.results[0].qMaxNetKPa);
 assert.equal(r.results[0].bearingPass,true);
});
test("bearing pressure exceeding the selected gross or net allowable capacity fails",()=>{
 const r=soil.checkRectangularFooting({...base,soil:{...base.soil,allowableBearingKPa:290},
  cases:[{name:"SLS-1",sourceReference:"Structural reaction report R-01 p.4",NkN:1000,MxkNm:20,MzkNm:15}]});
 assert.equal(r.success,false);assert.equal(r.results[0].status,"fail-bearing-pressure");
});
test("tension under gross linear full-contact assumption is blocked rather than accepted",()=>{
 const r=soil.checkRectangularFooting({...base,soil:{...base.soil,allowableBearingKPa:500},
  cases:[{name:"SLS-eccentric",sourceReference:"Structural reaction report R-02 p.3",NkN:100,MxkNm:0,MzkNm:70}]});
 assert.equal(r.results[0].fullContact,false);
 assert.equal(r.results[0].status,"blocked-no-tension-contact");
 assert.equal(r.success,false);
});
test("missing geotechnical source, invalid qa basis and non-compressive total vertical force are rejected",()=>{
 assert.throws(()=>soil.checkRectangularFooting({...base,soil:{...base.soil,sourceReference:""},cases:[{name:"SLS-1",sourceReference:"R-1",NkN:100}]}),/مرجع گزارش ژئوتکنیک/);
 assert.throws(()=>soil.checkRectangularFooting({...base,soil:{...base.soil,allowableBearingBasis:""},cases:[{name:"SLS-1",sourceReference:"R-1",NkN:100}]}),/مبنای ظرفیت مجاز/);
 assert.throws(()=>soil.checkRectangularFooting({...base,cases:[{name:"SLS-1",sourceReference:"R-1",NkN:-100}]}),/مجموع نیروی قائم/);
});
test("missing service cases and invalid footing dimensions or weight inputs are rejected",()=>{
 assert.throws(()=>soil.checkRectangularFooting({...base,cases:[]}),/حداقل یک حالت بار/);
 assert.throws(()=>soil.checkRectangularFooting({...base,Bm:0,cases:[{name:"SLS-1",sourceReference:"R-1",NkN:100}]}),/ابعاد پی/);
 assert.throws(()=>soil.checkRectangularFooting({...base,footingLoads:{...base.footingLoads,thicknessM:0},cases:[{name:"SLS-1",sourceReference:"R-1",NkN:100}]}),/ضخامت پی/);
});
test("ultimate or unsourced reaction cases are rejected",()=>{
 assert.throws(()=>soil.checkRectangularFooting({...base,cases:[{name:"ULS-1",sourceReference:"R-1",NkN:100}]}),/ترکیب بهره‌برداری SLS/);
 assert.throws(()=>soil.checkRectangularFooting({...base,cases:[{name:"SLS-1",NkN:100}]}),/مرجع گزارش تحلیل/);
});

test("rejects null axial reaction and blank moments instead of silently treating them as zero",()=>{
 assert.throws(()=>soil.checkRectangularFooting({...base,cases:[{name:"SLS-null",sourceReference:"R-1",NkN:null,MxkNm:0,MzkNm:0}]}),/نباید خالی باشد/);
 assert.throws(()=>soil.checkRectangularFooting({...base,cases:[{name:"SLS-blank",sourceReference:"R-1",NkN:100,MxkNm:"",MzkNm:0}]}),/نباید خالی باشد/);
});
