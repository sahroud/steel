"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const soil=require("../js/foundation-soil-check.js");
test("rectangular footing pressure check uses biaxial eccentricity and SLS inputs",()=>{
 const r=soil.checkRectangularFooting({soil:{allowableBearingKPa:350,sourceReference:"Geotech report G-01 p.12"},Bm:2,Lm:2,
  cases:[{name:"SLS-1",sourceReference:"Structural reaction report R-01 p.4",NkN:1000,MxkNm:20,MzkNm:15}]});
 const x=r.results[0];
 assert.equal(x.areaM2,4);
 assert.equal(x.eccentricityX_m,0.015);
 assert.equal(x.eccentricityZ_m,0.02);
 assert.equal(x.qAverageKPa,250);
 assert.ok(Math.abs(x.qMaxKPa-276.25)<1e-10);
 assert.ok(Math.abs(x.qMinKPa-223.75)<1e-10);
 assert.equal(x.bearingPass,true);
});
test("bearing pressure exceeding allowable capacity fails",()=>{
 const r=soil.checkRectangularFooting({soil:{allowableBearingKPa:270,sourceReference:"Report p.12"},Bm:2,Lm:2,
  cases:[{name:"SLS-1",sourceReference:"Structural reaction report R-01 p.4",NkN:1000,MxkNm:20,MzkNm:15}]});
 assert.equal(r.success,false);assert.equal(r.results[0].status,"fail-bearing-pressure");
});
test("tension under linear full-contact assumption is blocked rather than accepted",()=>{
 const r=soil.checkRectangularFooting({soil:{allowableBearingKPa:500,sourceReference:"Report p.12"},Bm:2,Lm:2,
  cases:[{name:"SLS-eccentric",sourceReference:"Structural reaction report R-02 p.3",NkN:100,MxkNm:0,MzkNm:50}]});
 assert.equal(r.results[0].fullContact,false);
 assert.equal(r.results[0].status,"blocked-no-tension-contact");
 assert.equal(r.success,false);
});
test("missing geotechnical source and non-compressive vertical force are rejected",()=>{
 assert.throws(()=>soil.checkRectangularFooting({soil:{allowableBearingKPa:200,sourceReference:""},Bm:2,Lm:2,cases:[{name:"SLS-1",sourceReference:"R-1",NkN:100}]}),/مرجع گزارش ژئوتکنیک/);
 assert.throws(()=>soil.checkRectangularFooting({soil:{allowableBearingKPa:200,sourceReference:"Report p.2"},Bm:2,Lm:2,cases:[{name:"SLS-1",sourceReference:"R-1",NkN:-10}]}),/نیروی قائم فشاری/);
});
test("missing service cases and invalid footing dimensions are rejected",()=>{
 assert.throws(()=>soil.checkRectangularFooting({soil:{allowableBearingKPa:200,sourceReference:"Report p.2"},Bm:2,Lm:2,cases:[]}),/حداقل یک حالت بار/);
 assert.throws(()=>soil.checkRectangularFooting({soil:{allowableBearingKPa:200,sourceReference:"Report p.2"},Bm:0,Lm:2,cases:[{name:"SLS-1",sourceReference:"R-1",NkN:100}]}),/ابعاد پی/);
});

test("ultimate or unsourced reaction cases are rejected",()=>{
 const soilData={soil:{allowableBearingKPa:250,sourceReference:"Geotech report p.12"},Bm:2,Lm:2};
 assert.throws(()=>soil.checkRectangularFooting({...soilData,cases:[{name:"ULS-1",sourceReference:"R-1",NkN:100}]}),/ترکیب بهره‌برداری SLS/);
 assert.throws(()=>soil.checkRectangularFooting({...soilData,cases:[{name:"SLS-1",NkN:100}]}),/مرجع گزارش تحلیل/);
});
