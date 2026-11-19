"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
require("../js/initial-member-sections.js");
const {resolve}=global.SahroudInitialMemberSections;
const model={members:[{id:"C1",group:"column"},{id:"R1",group:"rafter",section:{designation:"IPE300"}}]};
test("uses group defaults when no explicit user or model section exists",()=>{
 const r=resolve(model,{defaults:{column:{designation:"built-up-I-400"}}});
 assert.equal(r.records[0].source,"group-default");
 assert.equal(r.records[0].initialSection.designation,"built-up-I-400");
});
test("user input overrides group default and is marked as user input",()=>{
 const r=resolve(model,{defaults:{column:{designation:"I-350"}},overrides:[{memberId:"C1",section:{designation:"I-450"}}]});
 assert.equal(r.records[0].source,"user-input");
 assert.equal(r.records[0].initialSection.designation,"I-450");
});
test("preserves already assigned model section before falling back to group default",()=>{
 const r=resolve({members:[model.members[1]]},{defaults:{rafter:{designation:"I-400"}}});
 assert.equal(r.records[1].source,"existing-model-section");
 assert.equal(r.records[1].initialSection.designation,"IPE300");
});
test("blocks missing starting sections rather than inventing one",()=>{
 assert.throws(()=>resolve(model,{}),/مقطع اولیه مشخص نیست/);
});
test("rejects duplicate member overrides and unknown member IDs",()=>{
 assert.throws(()=>resolve(model,{overrides:[{memberId:"C1",section:{designation:"I1"}},{memberId:"C1",section:{designation:"I2"}}]}),/بیش از یک/);
 assert.throws(()=>resolve(model,{defaults:{column:{designation:"I"}},overrides:[{memberId:"X",section:{designation:"I"}}]}),/در مدل وجود ندارند/);
});
test("keeps the starting section as a snapshot and does not claim design approval",()=>{
 const section={designation:"I-400"};
 const r=resolve({members:[{id:"C1",group:"column",section}]},{});
 section.designation="changed";
 assert.equal(r.records[0].initialSection.designation,"I-400");
 assert.equal(r.records[0].optimizationStatus,"not-yet-checked");
});
test("accepts actual 3D section records identified by profile and preserves SI properties",()=>{
 const section={profile:"Built-up I",A:0.02,Iy:0.0001,Iz:0.0008,J:0.000002,E:200e9,G:77e9,sectionKey:"column"};
 const r=resolve({members:[{id:"C1",group:"column"}]},{overrides:[{memberId:"C1",section,sourceReference:"فرم مشخصات مقاطع"}]});
 assert.equal(r.records[0].initialSection.profile,"Built-up I");
 assert.equal(r.records[0].initialSection.A,0.02);
 assert.equal(r.records[0].source,"user-input");
});
