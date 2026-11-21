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


test("end-to-end real 3D solver actions reach concurrent member design candidates unchanged",()=>{
 require("../js/analysis-3d.js");
 const solver=global.SteelFrame3D;
 const demandApi=require("../js/member-demand-3d.js");
 require("../js/member-design-demand-3d.js");
 global.SahroudMemberDemand3D=demandApi;
 const section={E:200e9,G:80e9,A:0.012,Iy:3.2e-5,Iz:1.1e-4,J:2.5e-6};
 const modelData={
  nodes:[{id:"FIX",x:0,y:0,z:0},{id:"TIP",x:3,y:0,z:0}],
  members:[{id:"REAL-CANT",start:"FIX",end:"TIP",sectionKey:"column",length:3,
   referenceAxis:[0,0,1],sectionRollDeg:0,sectionOrientationVerified:true,
   sectionPropertyFingerprint:"real-solver-reference-section-v1",
   analysisLoad:{uniformLocal:[0,-200,0]}}]
 };
 const cases=[
  {id:"REAL-ULS-1",label:"REAL ULS 1",nodalLoads:[{nodeId:"TIP",values:[0,-1000,0,0,0,0]}]},
  {id:"REAL-ULS-2",label:"REAL ULS 2",nodalLoads:[{nodeId:"TIP",values:[0,-1500,0,0,0,0]}]}
 ].map(spec=>{
  const analysis=solver.analyze(modelData,{
   sectionResolver:()=>section,
   supports:[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}],
   nodalLoads:spec.nodalLoads
  });
  assert.equal(analysis.success,true);
  assert.equal(analysis.loadAssemblyAudit.ok,true);
  assert.equal(analysis.equilibrium.ok,true);
  assert.equal(analysis.memberCount,1);
  assert.equal(analysis.members[0].id,"REAL-CANT");
  assert.equal(analysis.members[0].length,3);
  assert.equal(analysis.members[0].localEndForces.length,12);
  return {id:spec.id,label:spec.label,analysis};
 });
 const prepared=api.buildConcurrentMemberDesignDemandFrom3D(cases,modelData);
 assert.equal(prepared.success,true,JSON.stringify(prepared.issues));
 assert.equal(prepared.caseCount,2);
 assert.equal(prepared.memberCount,1);
 const row=prepared.members[0];
 assert.ok(row.candidateCount>4);
 for(const item of cases){
  const recovered=demandApi.extractCase({
   ...item.analysis,loadCase:item.id,loadCaseLabel:item.label
  },modelData);
  const member=recovered.members[0];
  const candidates=row.candidates.filter(c=>c.combinationId===item.id);
  assert.ok(candidates.some(c=>Math.abs(c.x)<1e-10));
  assert.ok(candidates.some(c=>Math.abs(c.x-3)<1e-10));
  for(const station of [member.samples[0],member.samples[member.samples.length-1]]){
   const candidate=candidates.find(c=>Math.abs(c.x-station.x)<1e-10);
   assert.ok(candidate,"solver-derived end station must be preserved");
   for(const component of ["N","Vy","Vz","T","My","Mz"])
    assert.equal(candidate.values[component],station[component],
     item.id+" "+component+" at x="+station.x);
  }
 }
 assert.equal(prepared.interactionReady,false);
 assert.equal(prepared.capacityChecksReady,false);
});


test("multi-member spatial frame transfers local-axis-specific six-component demand through both cases",()=>{
 require("../js/analysis-3d.js");
 const solver=global.SteelFrame3D;
 const demandApi=require("../js/member-demand-3d.js");
 require("../js/member-design-demand-3d.js");
 global.SahroudMemberDemand3D=demandApi;
 const section={E:200e9,G:80e9,A:0.018,Iy:4.5e-5,Iz:1.35e-4,J:3.1e-6};
 const modelData={
  nodes:[
   {id:"BASE",x:0,y:0,z:0},
   {id:"KNEE",x:0,y:0,z:3},
   {id:"TIP",x:3,y:0,z:3}
  ],
  members:[
   {id:"FRAME-COL",start:"BASE",end:"KNEE",sectionKey:"column",length:3,
    referenceAxis:[0,1,0],sectionRollDeg:0,sectionOrientationVerified:true,
    sectionPropertyFingerprint:"spatial-frame-section-v1",analysisLoad:{uniformLocal:[0,-80,25]}},
   {id:"FRAME-RAF",start:"KNEE",end:"TIP",sectionKey:"rafter",length:3,
    referenceAxis:[0,0,1],sectionRollDeg:0,sectionOrientationVerified:true,
    sectionPropertyFingerprint:"spatial-frame-section-v1",analysisLoad:{uniformLocal:[0,-120,45]}}
  ]
 };
 const cases=[
  {id:"FRAME-ULS-A",label:"FRAME ULS A",factor:1},
  {id:"FRAME-ULS-B",label:"FRAME ULS B",factor:1.35}
 ].map(spec=>{
  const analysis=solver.analyze(modelData,{
   sectionResolver:()=>section,
   supports:[{nodeId:"BASE",fixedDofs:[0,1,2,3,4,5]}],
   nodalLoads:[{nodeId:"TIP",values:[0,-900*spec.factor,650*spec.factor,
    140*spec.factor,90*spec.factor,70*spec.factor]}]
  });
  assert.equal(analysis.success,true);
  assert.equal(analysis.loadAssemblyAudit.ok,true);
  assert.equal(analysis.equilibrium.ok,true);
  assert.equal(analysis.memberCount,2);
  assert.deepEqual(analysis.members.map(m=>m.id),["FRAME-COL","FRAME-RAF"]);
  assert.ok(analysis.members.every(m=>m.localEndForces.length===12));
  return {id:spec.id,label:spec.label,analysis};
 });
 const [column,rafter]=cases[0].analysis.members;
 assert.notDeepEqual(column.localAxes,rafter.localAxes,
  "column and rafter must exercise different solver-local coordinate systems");
 const prepared=api.buildConcurrentMemberDesignDemandFrom3D(cases,modelData);
 assert.equal(prepared.success,true,JSON.stringify(prepared.issues));
 assert.equal(prepared.caseCount,2);
 assert.equal(prepared.memberCount,2);
 for(const item of cases){
  const recovered=demandApi.extractCase({
   ...item.analysis,loadCase:item.id,loadCaseLabel:item.label
  },modelData);
  for(const member of recovered.members){
   const row=prepared.members.find(x=>x.id===member.id);
   assert.ok(row,"each physical frame member must be transferred");
   const candidates=row.candidates.filter(c=>c.combinationId===item.id);
   assert.equal(candidates.length,member.samples.length);
   for(const station of member.samples){
    const candidate=candidates.find(c=>Math.abs(c.x-station.x)<1e-10);
    assert.ok(candidate,"every recovered station must survive integration");
    for(const component of ["N","Vy","Vz","T","My","Mz"])
     assert.ok(Math.abs(candidate.values[component]-station[component])<1e-8,
      item.id+" "+member.id+" "+component+" at x="+station.x);
   }
   assert.ok(candidates.some(c=>Math.abs(c.x)<1e-10));
   assert.ok(candidates.some(c=>Math.abs(c.x-member.length)<1e-10));
  }
 }
 assert.equal(prepared.interactionReady,false);
 assert.equal(prepared.capacityChecksReady,false);
});


test("three-frame two-bay shed transfers every member station across all load combinations",()=>{
 require("../js/analysis-3d.js");
 const solver=global.SteelFrame3D;
 const demandApi=require("../js/member-demand-3d.js");
 require("../js/member-design-demand-3d.js");
 global.SahroudMemberDemand3D=demandApi;
 const section={E:200e9,G:80e9,A:0.016,Iy:3.8e-5,Iz:1.25e-4,J:2.8e-6};
 const nodes=[],members=[];
 const span=8,bay=6,eave=4,ridge=5.5;
 const node=(id,x,y,z)=>{nodes.push({id,x,y,z});return id;};
 const frames=[];
 for(let frame=0;frame<3;frame++){
  const y=frame*bay;
  frames.push({
   baseL:node("F"+frame+"-BL",0,y,0),
   baseR:node("F"+frame+"-BR",span,y,0),
   eaveL:node("F"+frame+"-EL",0,y,eave),
   eaveR:node("F"+frame+"-ER",span,y,eave),
   ridge:node("F"+frame+"-RG",span/2,y,ridge)
  });
 }
 const add=(id,start,end,sectionKey,referenceAxis,q)=>{
  const a=nodes.find(n=>n.id===start),b=nodes.find(n=>n.id===end);
  const length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
  members.push({id,start,end,length,sectionKey,type:sectionKey,
   referenceAxis,sectionRollDeg:0,sectionOrientationVerified:true,
   sectionPropertyFingerprint:"two-bay-shed-section-v1",
   analysisLoad:{uniformLocal:q}});
 };
 frames.forEach((f,i)=>{
  add("F"+i+"-COL-L",f.baseL,f.eaveL,"column",[0,1,0],[0,-35,8]);
  add("F"+i+"-COL-R",f.baseR,f.eaveR,"column",[0,1,0],[0,-35,8]);
  add("F"+i+"-RAF-L",f.eaveL,f.ridge,"rafter",[0,1,0],[0,-65,12]);
  add("F"+i+"-RAF-R",f.ridge,f.eaveR,"rafter",[0,1,0],[0,-65,-12]);
 });
 for(let bayIndex=0;bayIndex<2;bayIndex++){
  const a=frames[bayIndex],b=frames[bayIndex+1];
  add("B"+bayIndex+"-EAVE-L",a.eaveL,b.eaveL,"tie",[0,0,1],[0,-18,0]);
  add("B"+bayIndex+"-EAVE-R",a.eaveR,b.eaveR,"tie",[0,0,1],[0,-18,0]);
  add("B"+bayIndex+"-RIDGE",a.ridge,b.ridge,"roofPurlin",[0,0,1],[0,-22,0]);
  add("B"+bayIndex+"-SIDE-X1",a.baseL,b.eaveL,"brace",[1,0,0],[0,0,0]);
  add("B"+bayIndex+"-SIDE-X2",a.eaveL,b.baseL,"brace",[1,0,0],[0,0,0]);
  add("B"+bayIndex+"-ROOF-X1",a.eaveL,b.ridge,"brace",[0,0,1],[0,0,0]);
  add("B"+bayIndex+"-ROOF-X2",a.ridge,b.eaveR,"brace",[0,0,1],[0,0,0]);
 }
 const modelData={nodes,members};
 const supports=frames.flatMap(f=>[
  {nodeId:f.baseL,fixedDofs:[0,1,2,3,4,5]},
  {nodeId:f.baseR,fixedDofs:[0,1,2,3,4,5]}
 ]);
 const combinations=[
  {id:"SHED-ULS-G",label:"SHED ULS G",factor:1},
  {id:"SHED-ULS-S",label:"SHED ULS S",factor:1.25}
 ].map(spec=>{
  const nodalLoads=frames.flatMap(f=>[
   {nodeId:f.ridge,values:[0,-700*spec.factor,120*spec.factor,35*spec.factor,20*spec.factor,15*spec.factor]},
   {nodeId:f.eaveL,values:[0,-180*spec.factor,60*spec.factor,0,0,0]},
   {nodeId:f.eaveR,values:[0,-180*spec.factor,-60*spec.factor,0,0,0]}
  ]);
  const analysis=solver.analyze(modelData,{sectionResolver:()=>section,supports,nodalLoads});
  assert.equal(analysis.success,true);
  assert.equal(analysis.loadAssemblyAudit.ok,true);
  assert.equal(analysis.equilibrium.ok,true);
  assert.equal(analysis.memberCount,members.length);
  assert.equal(analysis.nodeCount,nodes.length);
  assert.deepEqual(analysis.members.map(m=>m.id),members.map(m=>m.id));
  assert.ok(analysis.members.every(m=>m.localEndForces.length===12));
  return {id:spec.id,label:spec.label,analysis};
 });
 // Re-run the same 3D shed with each independently selected brace end released.
  // The release must survive model cloning/analysis and return zero local end moments.
  for(const end of ["i","j"]){
   const targetId="B0-SIDE-X1";
   const releasedModel={nodes,members:members.map(m=>m.id===targetId
    ?{...m,endReleases:{[end]:["rx","ry","rz"]}}
    :{...m})};
   const factor=1;
   const nodalLoads=frames.flatMap(f=>[
    {nodeId:f.ridge,values:[0,-700*factor,120*factor,35*factor,20*factor,15*factor]},
    {nodeId:f.eaveL,values:[0,-180*factor,60*factor,0,0,0]},
    {nodeId:f.eaveR,values:[0,-180*factor,-60*factor,0,0,0]}
   ]);
   const releasedAnalysis=solver.analyze(releasedModel,{sectionResolver:()=>section,supports,nodalLoads});
   assert.equal(releasedAnalysis.success,true,"released "+end+" end: "+JSON.stringify(releasedAnalysis.issues||[]));
   assert.equal(releasedAnalysis.loadAssemblyAudit.ok,true);
   assert.equal(releasedAnalysis.equilibrium.ok,true);
   const releasedMember=releasedAnalysis.members.find(m=>m.id===targetId);
   assert.deepEqual(releasedMember.releasedLocalRotations,end==="i"?[3,4,5]:[9,10,11]);
   for(const dof of (end==="i"?[3,4,5]:[9,10,11]))
    assert.ok(Math.abs(releasedMember.localEndForces[dof])<1e-6,
     "released "+end+" end local moment component "+dof+" must be zero");
   assert.ok(Math.abs(releasedAnalysis.equilibrium.relativeForceResidual)<1e-8);
   assert.ok(Math.abs(releasedAnalysis.equilibrium.relativeMomentResidual)<1e-8);
  }
  const orientations=new Set(combinations[0].analysis.members.map(m=>JSON.stringify(m.localAxes)));
 assert.ok(orientations.size>=4,"columns, rafters, longitudinal members and braces exercise distinct spatial local axes");
 const prepared=api.buildConcurrentMemberDesignDemandFrom3D(combinations,modelData);
 assert.equal(prepared.success,true,JSON.stringify(prepared.issues));
 assert.equal(prepared.caseCount,2);
 assert.equal(prepared.memberCount,members.length);
 for(const combination of combinations){
  const recovered=demandApi.extractCase({
   ...combination.analysis,loadCase:combination.id,loadCaseLabel:combination.label
  },modelData);
  assert.equal(recovered.memberCount,members.length);
  for(const member of recovered.members){
   const row=prepared.members.find(x=>x.id===member.id);
   assert.ok(row,"member "+member.id+" must be transferred");
   const candidates=row.candidates.filter(c=>c.combinationId===combination.id);
   assert.equal(candidates.length,member.samples.length,member.id+" station count");
   for(const station of member.samples){
    const candidate=candidates.find(c=>Math.abs(c.x-station.x)<1e-10);
    assert.ok(candidate,member.id+" station "+station.x+" must be preserved");
    for(const component of ["N","Vy","Vz","T","My","Mz"])
     assert.ok(Math.abs(candidate.values[component]-station[component])<1e-8,
      combination.id+" "+member.id+" "+component+" at x="+station.x);
   }
   assert.ok(candidates.some(c=>Math.abs(c.x)<1e-10),member.id+" start endpoint");
   assert.ok(candidates.some(c=>Math.abs(c.x-member.length)<1e-8),member.id+" end endpoint");
  }
 }
 assert.equal(prepared.interactionReady,false);
 assert.equal(prepared.capacityChecksReady,false);
});
