"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const api=require("../js/member-design-demand-3d.js");
function input(){
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
 const model={members:[{id:"M1",length:5,sectionPropertyFingerprint:"fp-M1",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:axes,localAxesVerified:true},{id:"M2",length:4,sectionPropertyFingerprint:"fp-M2",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:axes,localAxesVerified:true}]};
 const combinationRun={success:true,caseCount:2,combinationResults:[
  {id:"ULS-A",label:"ULS A",analysis:{success:true}},
  {id:"ULS-B",label:"ULS B",analysis:{success:true}}
 ]};
 const demandApi={extractCase:analysis=>({memberCount:2,members:[
  {id:"M1",length:5,sectionPropertyFingerprint:"fp-M1",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:axes,localAxesVerified:true,samples:[{x:0,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},{x:5,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
  {id:"M2",sectionPropertyFingerprint:"fp-M2",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:axes,localAxesVerified:true,samples:[{x:0,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12},{x:4,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
 ]})};
 return {model,combinationRun,demandApi};
}
test("exports exact source combination IDs with every concurrent demand candidate",()=>{
 const x=input(),r=api.build(x.combinationRun,x.model,x.demandApi);
 assert.deepEqual(r.caseIds,["ULS-A","ULS-B"]);
 assert.equal(r.caseCount,2);assert.equal(r.members.length,2);
 assert.equal(r.members[0].candidates.length,4);
 assert.deepEqual(Object.keys(r.members[0].candidates[0].values),["N","Vy","Vz","T","My","Mz"]);
});
test("rejects missing and duplicate combination identities",()=>{
 const x=input();x.combinationRun.combinationResults[0].id="";
 assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/شناسه/);
 const y=input();y.combinationRun.combinationResults[1].id="ULS-A";
 assert.throws(()=>api.build(y.combinationRun,y.model,y.demandApi),/تکراری/);
});
test("rejects a recovered member without station samples",()=>{
 const x=input();x.demandApi.extractCase=()=>({memberCount:2,members:[{id:"M1",samples:[]},{id:"M2",samples:[{x:1,N:0,Vy:0,Vz:0,T:0,My:0,Mz:0}]}]});
 assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/ایستگاه‌های تقاضا/);
});

test("rejects duplicate recovered member IDs even when reported count matches",()=>{
 const x=input();
 x.demandApi.extractCase=()=>({memberCount:2,members:[
  {id:"M1",samples:[{x:0,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
  {id:"M1",samples:[{x:1,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]}
 ]});
 assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/تکراری/);
});
test("rejects a missing member hidden by an incorrect reported count",()=>{
 const x=input();
 x.demandApi.extractCase=()=>({memberCount:2,members:[
  {id:"M1",samples:[{x:0,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]}
 ]});
 assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/تعداد واقعی/);
});
test("rejects demand stations outside the actual member length",()=>{
 const x=input();
 x.demandApi.extractCase=()=>({memberCount:2,members:[
  {id:"M1",samples:[{x:5.1,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
  {id:"M2",samples:[{x:2,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
 ]});
 assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/خارج از طول/);
});
test("rejects duplicate station coordinates within one member and combination",()=>{
 const x=input();
 x.demandApi.extractCase=()=>({memberCount:2,members:[
  {id:"M1",samples:[{x:0,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},{x:0,N:2,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
  {id:"M2",samples:[{x:2,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
 ]});
 assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/ایستگاه تقاضای تکراری/);
});

test("rejects null and empty force components instead of coercing them to zero",()=>{
 for(const bad of [null,undefined,""]){
  const x=input();
  x.demandApi.extractCase=()=>({memberCount:2,members:[
   {id:"M1",samples:[{x:0,N:bad,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
   {id:"M2",samples:[{x:2,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
  ]});
  assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/تهی یا نامعتبر/);
 }
});
test("rejects null or empty station coordinates instead of treating them as zero",()=>{
 for(const bad of [null,""]){
  const x=input();
  x.demandApi.extractCase=()=>({memberCount:2,members:[
   {id:"M1",samples:[{x:bad,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
   {id:"M2",samples:[{x:2,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
  ]});
  assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/مختصات ایستگاه/);
 }
});
test("rejects boolean and whitespace force values and station coordinates",()=>{
 for(const bad of [true,false,"   "]){
  const x=input();
  x.demandApi.extractCase=()=>({memberCount:2,members:[
   {id:"M1",samples:[{x:0,N:bad,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
   {id:"M2",samples:[{x:2,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
  ]});
  assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/تهی یا نامعتبر/);
 }
 for(const bad of [true,false,"   "]){
  const x=input();
  x.demandApi.extractCase=()=>({memberCount:2,members:[
   {id:"M1",samples:[{x:bad,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
   {id:"M2",samples:[{x:2,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
  ]});
  assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/مختصات ایستگاه/);
 }
});
test("rejects non-integer or zero combination counts",()=>{
 for(const count of [0,1.5,"2"]){
  const x=input();x.combinationRun.caseCount=count;
  assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/نتایج کامل/);
 }
});

test("rejects changed section fingerprints and local axes across load combinations",()=>{const x=input();x.demandApi.extractCase=(analysis)=>({memberCount:2,members:[{id:"M1",sectionPropertyFingerprint:analysis.loadCase==="ULS-A"?"fp-M1":"changed",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},localAxesVerified:true,samples:[{x:0,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},{x:5,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},{id:"M2",sectionPropertyFingerprint:"fp-M2",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},localAxesVerified:true,samples:[{x:0,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12},{x:4,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}]});assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/شناسنامه مقطع/);});
test("rejects demand without explicit section identity and local orientation",()=>{const x=input();x.demandApi.extractCase=()=>({memberCount:2,members:[{id:"M1",samples:[{x:0,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},{x:5,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},{id:"M2",samples:[{x:0,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12},{x:4,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}]});assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/شناسنامه مقطع/);});

test("requires both physical member ends in every load-combination station set",()=>{
 const x=input();
 x.demandApi.extractCase=()=>({memberCount:2,members:[
  {id:"M1",sectionPropertyFingerprint:"fp-M1",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},localAxesVerified:true,samples:[{x:0,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6},{x:4,N:1,Vy:2,Vz:3,T:4,My:5,Mz:6}]},
  {id:"M2",sectionPropertyFingerprint:"fp-M2",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},localAxesVerified:true,samples:[{x:0,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12},{x:4,N:7,Vy:8,Vz:9,T:10,My:11,Mz:12}]}
 ]});
 assert.throws(()=>api.build(x.combinationRun,x.model,x.demandApi),/هر دو انتهای واقعی عضو/);
});
