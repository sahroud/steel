"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const api=require("../js/member-demand-3d.js");
test("rejects booleans and whitespace in solver force, load, station, and axis inputs",()=>{
 const base={id:"M1",length:5,localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0]}};
 for(const bad of [true,false,"   "]){
  const force={...base,localEndForces:base.localEndForces.slice()};force.localEndForces[0]=bad;
  assert.throws(()=>api.recoverMember(force),/۱۲ مؤلفه‌ای/);
  const load={...base,analysisLoad:{uniformLocal:[bad,0,0]}};
  assert.throws(()=>api.recoverMember(load),/بار گسترده/);
  assert.throws(()=>api.sectionForcesAt(base,bad),/مختصات مقطع/);
  const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};axes.y[1]=bad;
  assert.throws(()=>api.recoverMember({...base,localAxes:axes}),/محورهای محلی/);
 }
});
test("rejects boolean and whitespace member lengths",()=>{
 for(const bad of [true,false,"   "])
  assert.throws(()=>api.recoverMember({id:"M",length:bad,localEndForces:Array(12).fill(0)}),/طول عضو/);
});

test("extractCase carries the analyzed section fingerprint, roll confirmation, and solver local axes",()=>{const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};const model={members:[{id:"M1",sectionKey:"rafter",sectionPropertyFingerprint:"fp-123",sectionOrientationVerified:true,sectionRollDeg:90,sectionOrientationSource:"verified-fabrication-input",sectionProperties:{sectionPropertyFingerprint:"fp-123",sectionRollDeg:90},analysisLoad:{uniformLocal:[0,0,0]}}]};const result=api.extractCase({success:true,loadCase:"ULS-1",members:[{id:"M1",length:4,localEndForces:Array(12).fill(0),localAxes:axes}]},model);const m=result.members[0];assert.equal(m.sectionPropertyFingerprint,"fp-123");assert.equal(m.sectionOrientationVerified,true);assert.equal(m.sectionRollDeg,90);assert.equal(m.localAxesVerified,true);assert.deepEqual(m.localAxes,axes);});

test("demand envelope preserves verified local axes and section orientation metadata",()=>{
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
 const model={members:[{id:"M1",sectionKey:"rafter",sectionPropertyFingerprint:"fp-a",
  sectionOrientationVerified:true,sectionRollDeg:90,
  sectionProperties:{sectionPropertyFingerprint:"fp-a",sectionRollDeg:90},
  analysisLoad:{uniformLocal:[0,0,0]}}]};
 const makeCase=(loadCase)=>({success:true,loadCase,loadCaseLabel:loadCase,
  members:[{id:"M1",length:4,localEndForces:Array(12).fill(0),localAxes:axes,sectionRollDeg:90}]});
 const result=api.envelope([makeCase("ULS-1"),makeCase("ULS-2")],model);
 const member=result.members[0];
 assert.deepEqual(member.localAxes,axes);
 assert.equal(member.localAxesVerified,true);
 assert.equal(member.sectionOrientationVerified,true);
 assert.equal(member.sectionPropertyFingerprint,"fp-a");
 assert.equal(member.sectionRollDeg,90);
});

test("demand envelope rejects inconsistent local axes between load combinations",()=>{
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
 const rolled={x:[1,0,0],y:[0,0,1],z:[0,-1,0]};
 const model={members:[{id:"M1",sectionKey:"rafter",sectionPropertyFingerprint:"fp-a",
  sectionOrientationVerified:true,sectionRollDeg:90,
  sectionProperties:{sectionPropertyFingerprint:"fp-a",sectionRollDeg:90},
  analysisLoad:{uniformLocal:[0,0,0]}}]};
 const makeCase=(loadCase,localAxes)=>({success:true,loadCase,loadCaseLabel:loadCase,
  members:[{id:"M1",length:4,localEndForces:Array(12).fill(0),localAxes,sectionRollDeg:90}]});
 assert.throws(()=>api.envelope([makeCase("ULS-1",axes),makeCase("ULS-2",rolled)],model),/محورهای محلی بین ترکیبات بار یکسان نیستند/);
});
