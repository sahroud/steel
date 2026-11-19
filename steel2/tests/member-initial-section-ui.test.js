"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
require("../js/member-initial-section-ui.js");
require("../js/built-up-section.js");
require("../js/initial-member-sections.js");
const ui=global.SahroudMemberInitialSectionUI;
const resolver=global.SahroudInitialMemberSections;
test("converts per-member user geometry from cm units to SI without changing material",()=>{
 const base={profile:"Group I",E:200e9,G:77e9,A:0.01,Iy:0.00004,Iz:0.0003,J:0.000001,sectionKey:"rafter"};
 const item=ui.createOverride("R-17",base,{profile:"Rafter custom",A_cm2:125,Iy_cm4:8200,Iz_cm4:65000,J_cm4:120});
 assert.equal(item.memberId,"R-17");
 assert.equal(item.section.profile,"Rafter custom");
 assert.equal(item.section.A,0.0125);
 assert.equal(item.section.Iy,8200e-8);
 assert.equal(item.section.Iz,65000e-8);
 assert.equal(item.section.J,120e-8);
 assert.equal(item.section.E,base.E);
 assert.equal(item.section.G,base.G);
});
test("rejects incomplete or non-positive member section input",()=>{
 const base={E:200e9,G:77e9,A:0.01,Iy:1e-5,Iz:2e-5,J:1e-6};
 assert.throws(()=>ui.createOverride("C-1",base,{profile:"I",A_cm2:0,Iy_cm4:1,Iz_cm4:1,J_cm4:1}),/مساحت A/);
 assert.throws(()=>ui.createOverride("C-1",base,{profile:"",A_cm2:10,Iy_cm4:1,Iz_cm4:1,J_cm4:1}),/نام مقطع/);
});
test("resolver gives a single member's explicit input priority over its group section",()=>{
 const base={profile:"Group I",E:200e9,G:77e9,A:0.01,Iy:1e-5,Iz:2e-5,J:1e-6};
 const individual=ui.createOverride("C-1",base,{profile:"User I",A_cm2:120,Iy_cm4:2000,Iz_cm4:30000,J_cm4:100});
 const result=resolver.resolve({members:[{id:"C-1",group:"column"},{id:"C-2",group:"column"}]},{
  defaults:{column:base},overrides:[individual]
 });
 assert.equal(result.records[0].source,"user-input");
 assert.equal(result.records[0].initialSection.profile,"User I");
 assert.equal(result.records[1].source,"group-default");
 assert.equal(result.records[1].initialSection.profile,"Group I");
});

test("stores and restores per-member overrides as project data",()=>{
 const base={profile:"I group",E:200e9,G:77e9,A:0.01,Iy:1e-5,Iz:2e-5,J:1e-6};
 const saved={memberId:"C-22",section:{...base,profile:"I user",A:0.015},sourceReference:"project"};
 ui.setData([saved]);
 assert.equal(ui.getData().length,1);
 assert.equal(ui.getData()[0].memberId,"C-22");
 assert.equal(ui.getData()[0].section.A,0.015);
 ui.setData([]);
 assert.equal(ui.getData().length,0);
});

test("feeds persisted per-member section override into the initial resolver",()=>{
 const base={profile:"Z group",E:200e9,G:77e9,A:0.01,Iy:1e-5,Iz:2e-5,J:1e-6,sectionKey:"roofPurlin"};
 const saved={memberId:"P-4",section:{...base,profile:"Z custom",A:0.014},sourceReference:"saved project"};
 ui.setData([saved]);
 const model={members:[{id:"P-4",sectionKey:"roofPurlin"},{id:"P-5",sectionKey:"roofPurlin"}]};
 const overrides=ui.readOverrides(model,[{memberId:"P-4",section:base},{memberId:"P-5",section:base}]);
 const result=resolver.resolve(model,{defaults:{roofPurlin:base},overrides});
 assert.equal(result.records[0].source,"user-input");
 assert.equal(result.records[0].initialSection.profile,"Z custom");
 assert.equal(result.records[1].source,"group-default");
 ui.setData([]);
});

test("built-up I geometry recalculates area, both inertias and torsion from dimensions",()=>{
 const result=global.SahroudBuiltUpSection.calculateBuiltUpISection({
  profile:"Plate girder",
  topFlangeWidthMm:200,topFlangeThicknessMm:12,
  bottomFlangeWidthMm:220,bottomFlangeThicknessMm:14,
  webClearHeightMm:500,webThicknessMm:8
 });
 assert.ok(result.areaCm2>0);
 assert.ok(result.strongAxis.inertiaCm4>result.weakAxis.inertiaCm4);
 assert.ok(result.torsion.JApproxCm4>0);
 assert.equal(result.dimensionsMm.totalDepthMm,526);
 assert.equal(result.designStatus,"geometry-only-not-code-verified");
});
test("changing a built-up section dimension changes its derived properties",()=>{
 const calc=global.SahroudBuiltUpSection.calculateBuiltUpISection;
 const base={topFlangeWidthMm:200,topFlangeThicknessMm:12,bottomFlangeWidthMm:220,bottomFlangeThicknessMm:14,webClearHeightMm:500,webThicknessMm:8};
 const first=calc(base), changed=calc({...base,webClearHeightMm:650});
 assert.notEqual(first.areaCm2,changed.areaCm2);
 assert.notEqual(first.strongAxis.inertiaCm4,changed.strongAxis.inertiaCm4);
});
