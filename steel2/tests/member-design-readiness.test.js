"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const api=require("../js/member-design-readiness.js");
function fixture(){
 const members=[{id:"C1",length:6,sectionKey:"column",sectionOrientationVerified:true,localAxes:{x:[1,0,0]},localAxesVerified:true,
  sectionProperties:{profile:"Built-up I",A:.02,Iy:.00008,Iz:.0009,J:.000001,E:200e9,G:77e9,SxTop:.00008,SxBottom:.00009,Sy:.00002,geometryType:"built-up-I"}}];
 const demand={success:true,caseCount:1,caseIds:["ULS-1"],members:[{id:"C1",candidates:[{combinationId:"ULS-1",x:0,values:{N:-1000,Vy:200,Vz:300,T:10,My:400,Mz:500}},{combinationId:"ULS-1",x:6,values:{N:-900,Vy:100,Vz:200,T:8,My:300,Mz:400}}]}]};
 return {model:{members},demand};
}
test("audits complete model-to-demand member coverage without claiming design approval",()=>{
 const {model,demand}=fixture(),r=api.audit(model,demand);
 assert.equal(r.success,true);assert.equal(r.complete,true);
 assert.equal(r.memberCount,1);assert.equal(r.inputReadyCount,1);
 assert.equal(r.designAssessableCount,0);assert.equal(r.designComplete,false);
 assert.equal(r.rows[0].designStatus,"NOT_ASSESSABLE");
});
test("reports missing member demand and extra demand identifiers",()=>{
 const {model,demand}=fixture();demand.members[0].id="OTHER";
 const r=api.audit(model,demand);
 assert.equal(r.complete,false);
 assert.ok(r.errors.some(x=>x.includes("تقاضا موجود نیست")));
 assert.ok(r.errors.some(x=>x.includes("خارج از مدل")));
});
test("rejects duplicate and blank model member identifiers in the audit",()=>{
 const {model,demand}=fixture();model.members.push({...model.members[0]});
 assert.equal(api.audit(model,demand).complete,false);
 model.members[1].id="";
 assert.equal(api.audit(model,demand).complete,false);
});
test("marks missing section properties and unverified orientation as incomplete",()=>{
 const {model,demand}=fixture();delete model.members[0].sectionProperties;model.members[0].sectionOrientationVerified=false;
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("مقطع")));
 assert.ok(r.rows[0].issues.some(x=>x.includes("جهت نصب")));
});
test("requires all six simultaneous force components for every demand candidate",()=>{
 const {model,demand}=fixture();delete demand.members[0].candidates[0].values.Mz;
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("بردار تقاضا")));
});
test("rejects demand stations outside member length and candidates without combination IDs",()=>{
 const {model,demand}=fixture();demand.members[0].candidates[0].x=7;delete demand.members[0].candidates[1].combinationId;
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("خارج از طول")));
 assert.ok(r.rows[0].issues.some(x=>x.includes("شناسه ترکیب")));
});
test("rejects non-positive section properties and missing section geometry identity",()=>{
 const {model,demand}=fixture();model.members[0].sectionProperties.J=0;delete model.members[0].sectionProperties.geometryType;
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("خاصیت مقطع J")));
 assert.ok(r.rows[0].issues.some(x=>x.includes("شناسنامه هندسی")));
});
test("requires valid local axes and confirmed section orientation",()=>{
 const {model,demand}=fixture();model.members[0].localAxesVerified=false;model.members[0].sectionOrientationVerified=false;
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("محورهای محلی")));
 assert.ok(r.rows[0].issues.some(x=>x.includes("جهت نصب")));
});
test("rejects null and empty strings instead of silently treating them as zero",()=>{
 const {model,demand}=fixture();demand.members[0].candidates[0].values.Vy=null;demand.members[0].candidates[1].x="";
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("تهی/غیرعددی")));
 assert.ok(r.rows[0].issues.some(x=>x.includes("ایستگاه")));
});
test("requires coverage of every load combination declared by the 3D demand package",()=>{
 const {model,demand}=fixture();demand.caseCount=2;
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("پوشش ترکیبات بار")));
});
test("rejects duplicate combination-station candidates",()=>{
 const {model,demand}=fixture();demand.members[0].candidates.push({...demand.members[0].candidates[0]});
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("تکراری")));
});
test("throws when the model or design-demand package is absent",()=>{
 assert.throws(()=>api.audit({members:[]},{}),/مدل اعضا/);
 const {model}=fixture();assert.throws(()=>api.audit(model,null),/بسته تقاضا/);
});

test("rejects unknown combination identifiers even when their count matches",()=>{
 const {model,demand}=fixture();demand.caseIds=["ULS-1","ULS-2"];demand.caseCount=2;
 demand.members[0].candidates.push({...demand.members[0].candidates[0],combinationId:"FAKE-2",x:3});
 const r=api.audit(model,demand);
 assert.equal(r.rows[0].inputStatus,"INCOMPLETE");
 assert.ok(r.rows[0].issues.some(x=>x.includes("در فهرست ترکیبات واقعی")));
 assert.ok(r.rows[0].issues.some(x=>x.includes("ترکیبات واقعی تحلیل")));
});
test("blocks missing, duplicate, or blank expected combination identity lists",()=>{
 const {model,demand}=fixture();delete demand.caseIds;
 assert.equal(api.audit(model,demand).complete,false);
 demand.caseIds=["ULS-1","ULS-1"];demand.caseCount=2;
 assert.equal(api.audit(model,demand).complete,false);
 demand.caseIds=["ULS-1",""];demand.caseCount=2;
 assert.equal(api.audit(model,demand).complete,false);
});
