"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {calculateBuiltUpISection}=require("../js/built-up-section.js");

test("symmetric built-up I section has centered centroid and expected area",()=>{
  const r=calculateBuiltUpISection({
    topFlangeWidthMm:300,topFlangeThicknessMm:16,
    bottomFlangeWidthMm:300,bottomFlangeThicknessMm:16,
    webClearHeightMm:600,webThicknessMm:10
  });
  assert.equal(r.areaCm2,156);
  assert.equal(r.centroidYFromBottomMm,316);
  assert.ok(r.strongAxis.inertiaCm4>r.weakAxis.inertiaCm4);
  assert.equal(r.strongAxis.sectionModulusTopCm3,r.strongAxis.sectionModulusBottomCm3);
  assert.equal(r.designStatus,"geometry-only-not-code-verified");
  assert.equal(r.torsion.warpingIncluded,false);
});

test("asymmetric flanges produce correct centroid and distinct top/bottom moduli",()=>{
  const r=calculateBuiltUpISection({
    topFlangeWidthMm:260,topFlangeThicknessMm:20,
    bottomFlangeWidthMm:320,bottomFlangeThicknessMm:12,
    webClearHeightMm:500,webThicknessMm:10
  });
  assert.ok(r.centroidYFromBottomMm>250);
  assert.ok(r.centroidYFromBottomMm<512);
  assert.notEqual(r.strongAxis.sectionModulusTopCm3,r.strongAxis.sectionModulusBottomCm3);
  assert.ok(r.areaCm2>0&&r.strongAxis.inertiaCm4>0&&r.weakAxis.inertiaCm4>0);
});

test("section calculator rejects missing, non-finite and geometrically impossible dimensions",()=>{
  const base={topFlangeWidthMm:300,topFlangeThicknessMm:16,bottomFlangeWidthMm:300,bottomFlangeThicknessMm:16,webClearHeightMm:600,webThicknessMm:10};
  assert.throws(()=>calculateBuiltUpISection({...base,webThicknessMm:0}),/مثبت/);
  assert.throws(()=>calculateBuiltUpISection({...base,webThicknessMm:400}),/عرض/);
  assert.throws(()=>calculateBuiltUpISection({...base,webClearHeightMm:5}),/ارتفاع خالص/);
  assert.throws(()=>calculateBuiltUpISection({...base,topFlangeWidthMm:Infinity}),/مثبت/);
});

test("unit conversions for area, inertia and section modulus are explicit",()=>{
  const r=calculateBuiltUpISection({
    topFlangeWidthMm:100,topFlangeThicknessMm:10,
    bottomFlangeWidthMm:100,bottomFlangeThicknessMm:10,
    webClearHeightMm:180,webThicknessMm:8
  });
  assert.equal(r.areaCm2,35.4);
  assert.ok(r.strongAxis.inertiaCm4>0);
  assert.ok(r.strongAxis.sectionModulusTopCm3>0);
  assert.equal(r.units.area,"cm2");
  assert.equal(r.units.inertia,"cm4");
  assert.equal(r.units.sectionModulus,"cm3");
});
