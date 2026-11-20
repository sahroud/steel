"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.document = {
  readyState: "loading",
  addEventListener() {},
  getElementById() { return null; }
};
require("../js/member-demand-3d.js");
require("../js/member-design-demand-3d.js");
const api = require("../js/compression-design-integration.js");
const model = {members:[{id:"M1",sectionKey:"column",length:6}]};
const vector = [120000,0,0,0,0,0,-120000,0,0,0,0,0];
const combination = (id) => ({id,label:id,members:[{id:"M1",length:6,localEndForces:vector}]});

test("3D compression demand requires unique explicit load-combination identities", () => {
  const duplicate = api.buildCompressionDemandRowsFrom3D(
    [combination("ULS-1"), combination("ULS-1")], model
  );
  assert.equal(duplicate.success, false);
  assert.ok(duplicate.issues.some(x => x.includes("تکراری")));
  const missing = api.buildCompressionDemandRowsFrom3D(
    [{label:"",members:[{id:"M1",length:6,localEndForces:vector}]}], model
  );
  assert.equal(missing.success, false);
  assert.ok(missing.issues.some(x => x.includes("شناسه صریح")));
});

test("axial screening coverage requires a positive declared expected case count", () => {
  const rows = api.buildCompressionDemandRows({
    success:true,
    members:[{id:"M1",sectionKey:"column",ends:[{label:"ULS-1",values:vector}]}]
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].coverageComplete, false);
});

test("complete uniquely identified 3D combinations preserve full member coverage", () => {
  const result = api.buildCompressionDemandRowsFrom3D(
    [combination("ULS-1"), combination("ULS-2")], model
  );
  assert.equal(result.success, true, JSON.stringify(result.issues));
  assert.deepEqual(result.caseIds, ["ULS-1","ULS-2"]);
  assert.equal(result.members.length, 1);
  assert.equal(result.members[0].coverageComplete, true);
  assert.equal(result.members[0].caseCount, 2);
});

test("null, empty, boolean and non-finite force components never coerce to zero", () => {
  for (const bad of [null, "", "   ", true, Infinity, NaN]) {
    const values = [1000,0,0,0,0,0,-1000,0,0,0,0,0];
    values[4] = bad;
    const rows = api.buildCompressionDemandRows({
      success:true, expectedCaseCount:1,
      members:[{id:"M1",sectionKey:"column",ends:[{label:"ULS-1",values}]}]
    });
    assert.equal(rows[0].coverageComplete,false, String(bad));
    assert.equal(rows[0].invalidCaseCount,1, String(bad));
  }
});

test("empty or duplicate load-case labels block complete coverage", () => {
  for (const ends of [
    [{label:"",values:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}],
    [
      {label:"ULS-1",values:[1000,0,0,0,0,0,-1000,0,0,0,0,0]},
      {label:"ULS-1",values:[1200,0,0,0,0,0,-1200,0,0,0,0,0]}
    ]
  ]) {
    const rows=api.buildCompressionDemandRows({
      success:true,expectedCaseCount:ends.length,
      members:[{id:"M1",sectionKey:"column",ends}]
    });
    assert.equal(rows[0].coverageComplete,false);
  }
});

test("3D mapping rejects truncated and overlong 12-component member force vectors", () => {
  for (const badVector of [vector.slice(0,11), [...vector, 99]]) {
    const result = api.buildCompressionDemandRowsFrom3D(
      [{id:"ULS-BAD",members:[{id:"M1",length:6,localEndForces:badVector}]}],
      model
    );
    assert.equal(result.success, false);
    assert.ok(result.issues.some(x => x.includes("دقیقاً ۱۲ مؤلفه")));
    assert.equal(result.members[0].coverageComplete, false);
    assert.equal(result.members[0].invalidCaseCount, 1);
  }
});

test("3D mapping preserves concurrent internal-force stations per combination", () => {
  const samples = [
    {x:0,N:1000,Vy:10,Vz:20,T:30,My:40,Mz:50},
    {x:3,N:1100,Vy:11,Vz:21,T:31,My:41,Mz:51},
    {x:6,N:1200,Vy:12,Vz:22,T:32,My:42,Mz:52}
  ];
  const result = api.buildCompressionDemandRowsFrom3D([
    {id:"ULS-1",members:[{id:"M1",length:6,localEndForces:vector,samples}]},
    {id:"ULS-2",members:[{id:"M1",length:6,localEndForces:vector,samples:samples.map(x=>({...x,My:x.My*2}))}]}
  ], model);
  const row=result.members[0];
  assert.equal(result.success,true,JSON.stringify(result.issues));
  assert.equal(row.stationCoverageComplete,true);
  assert.deepEqual(row.stationCases[0].stations,samples);
  assert.equal(row.stationCases[1].stations[1].My,82);
  assert.equal(row.simultaneousCases.length,2);
});
test("missing, malformed, or incomplete internal-force stations are explicitly not assessable", () => {
  const good = [
    {x:0,N:1,Vy:0,Vz:0,T:0,My:0,Mz:0},
    {x:6,N:1,Vy:0,Vz:0,T:0,My:0,Mz:0}
  ];
  const cases = [
    {id:"NO-STATIONS",members:[{id:"M1",length:6,localEndForces:vector}]},
    {id:"BAD-STATIONS",members:[{id:"M1",length:6,localEndForces:vector,samples:[...good,{x:3,N:1,Vy:0,Vz:0,T:0,My:0,Mz:Infinity}]}]},
    {id:"NO-ENDPOINT",members:[{id:"M1",length:6,localEndForces:vector,samples:[{...good[0],x:1},good[1]]}]}
  ];
  for (const c of cases) {
    const row=api.buildCompressionDemandRowsFrom3D([c],model).members[0];
    assert.equal(row.stationCoverageComplete,false,c.id);
    assert.equal(row.coverageComplete,true,c.id);
  }
});
test("3D mapping rejects nonnumeric force components without coercing them", () => {
  for (const bad of [null, "", "   ", true, Infinity, NaN]) {
    const badVector = vector.slice();
    badVector[5] = bad;
    const result = api.buildCompressionDemandRowsFrom3D(
      [{id:"ULS-BAD",members:[{id:"M1",length:6,localEndForces:badVector}]}],
      model
    );
    assert.equal(result.success, false, String(bad));
    assert.equal(result.members[0].coverageComplete, false, String(bad));
    assert.equal(result.members[0].invalidCaseCount, 1, String(bad));
  }
});

test("3D compression integration invokes the concurrent station-level demand pipeline",()=>{
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
 const modelData={members:[{id:"M1",sectionKey:"column",length:6,sectionPropertyFingerprint:"fp",sectionOrientationVerified:true,sectionRollDeg:0,localAxes:axes,localAxesVerified:true}]};
 const sample=(x,n)=>({x,N:n,Vy:10,Vz:20,T:30,My:40,Mz:50});
 const demandApi={
  extractCase:(analysis)=>({memberCount:1,members:[{
   id:"M1",length:6,sectionPropertyFingerprint:"fp",sectionOrientationVerified:true,
   sectionRollDeg:0,localAxes:axes,localAxesVerified:true,
   samples:[sample(0,analysis.loadCase==="C1"?100:200),sample(3,analysis.loadCase==="C1"?110:210),sample(6,analysis.loadCase==="C1"?120:220)]
  }]})
 };
 global.SahroudMemberDemand3D=demandApi;
 const combinations=[
  {id:"C1",label:"ULS-1",analysis:{success:true}},
  {id:"C2",label:"ULS-2",analysis:{success:true}}
 ];
 const result=api.buildConcurrentMemberDesignDemandFrom3D(combinations,modelData);
 assert.equal(result.success,true,JSON.stringify(result.issues));
 assert.equal(result.caseCount,2);
 assert.equal(result.memberCount,1);
 assert.equal(result.members[0].candidateCount,6);
 assert.equal(result.members[0].candidates[1].combinationId,"C1");
 assert.equal(result.members[0].candidates[1].x,3);
 assert.equal(result.members[0].candidates[4].combinationId,"C2");
 assert.equal(result.interactionReady,false);
 assert.equal(result.capacityChecksReady,false);
});
test("concurrent member demand integration refuses missing solver cases",()=>{
 const result=api.buildConcurrentMemberDesignDemandFrom3D([{id:"C1",members:[]}],model);
 assert.equal(result.success,false);
 assert.ok(result.issues.some(x=>x.includes("نتیجه موفق حل‌گر")));
});
