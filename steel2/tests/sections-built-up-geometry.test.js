"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const values={};
global.window=globalThis;
global.document={readyState:"loading",addEventListener(){},getElementById(id){return values[id]||null;}};
const calculator=require("../js/built-up-section.js");
require("../js/sections.js");
const sections=global.SteelSections;
const dims={topFlangeWidthMm:220,topFlangeThicknessMm:12,bottomFlangeWidthMm:200,bottomFlangeThicknessMm:12,webClearHeightMm:500,webThicknessMm:8};
function setGeometry(prefix="column",geometry=dims){
 const suffix={topFlangeWidthMm:"bt",topFlangeThicknessMm:"tt",bottomFlangeWidthMm:"bb",bottomFlangeThicknessMm:"tb",webClearHeightMm:"hw",webThicknessMm:"tw"};
 Object.entries(suffix).forEach(([key,id])=>values["bg_"+prefix+"_"+id]={value:String(geometry[key]??"")});
}
function memberFor(geometry=dims){
 const result=calculator.calculateBuiltUpISection(geometry);
 return {profile:"تیرورق I",A_cm2:result.areaCm2,Ix_cm4:result.strongAxis.inertiaCm4,
  Iy_cm4:result.weakAxis.inertiaCm4,SxTop_cm3:result.strongAxis.sectionModulusTopCm3,
  SxBottom_cm3:result.strongAxis.sectionModulusBottomCm3,Sy_cm3:result.weakAxis.sectionModulusCm3};
}
test("group-built-up dimensions are carried only when all gross properties match the calculator",()=>{
 setGeometry();const result=sections.deriveBuiltUpGeometryRecord("column",memberFor());
 assert.equal(result.geometryType,"built-up-I");
 assert.deepEqual(result.geometryDimensionsMm,dims);
});
test("manually edited section properties do not inherit stale built-up geometry",()=>{
 setGeometry();const member=memberFor();member.Ix_cm4*=1.2;
 assert.equal(sections.deriveBuiltUpGeometryRecord("column",member),null);
});
test("missing group geometry fields do not create a parametric section record",()=>{
 setGeometry();delete values.bg_column_tw;
 assert.equal(sections.deriveBuiltUpGeometryRecord("column",memberFor()),null);
});
test("invalid built-up dimensions are rejected without inferred geometry",()=>{
 const invalid={...dims,webThicknessMm:250};
 setGeometry("column",invalid);
 assert.equal(sections.deriveBuiltUpGeometryRecord("column",memberFor()),null);
});
