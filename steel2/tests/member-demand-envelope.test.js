"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync(new URL("../js/auto-workflow.js", "file://"+__filename), "utf8");
const window={};
const document={readyState:"loading",addEventListener(){}};
vm.runInNewContext(source,{window,document,console});
const build=window.SteelAutoWorkflow.build3DMemberDemandEnvelope;

function member(id,forces){return {id,type:"rafter",length:12,section:{profile:"plate-girder"},localEndForces:forces};}

test("extracts signed component envelopes from successful equilibrated 3D cases",()=>{
 const a=[10,-20,30,-4,50,-60,-11,21,-31,5,-51,61];
 const b=[-15,12,18,7,-45,40,14,-25,35,-8,55,-42];
 const out=build([
  {success:true,equilibriumOK:true,index:0,label:"ULS-A",result:{members:[member("R1",a)]}},
  {success:true,equilibriumOK:true,index:1,label:"ULS-B",result:{members:[member("R1",b)]}}
 ]);
 assert.equal(out.members.length,1);
 const r=out.members[0];
 assert.equal(r.memberId,"R1");
 assert.deepEqual(JSON.parse(JSON.stringify(r.cases)),["ULS-A","ULS-B"]);
 assert.deepEqual(JSON.parse(JSON.stringify(r.values.N)),{min:-15,max:14,maxAbs:15});
 assert.deepEqual(JSON.parse(JSON.stringify(r.values.Mz)),{min:-60,max:61,maxAbs:61});
 assert.equal(out.units.force,"N");
 assert.equal(out.units.moment,"N.m");
 assert.equal(out.designStatus,"demand-only-not-capacity-checked");
});

test("rejects failed or unbalanced cases and malformed force vectors",()=>{
 const out=build([
  {success:false,equilibriumOK:true,result:{members:[member("bad1",Array(12).fill(1))]}},
  {success:true,equilibriumOK:false,result:{members:[member("bad2",Array(12).fill(1))]}},
  {success:true,equilibriumOK:true,result:{members:[member("bad3",[1,2,3])]}}
 ]);
 assert.equal(out.acceptedCases,0);
 assert.equal(out.rejectedCases,3);
 assert.equal(out.members.length,0);
});

test("keeps separate members and deduplicates combination labels",()=>{
 const forces=Array.from({length:12},(_,i)=>i+1);
 const out=build([
  {success:true,equilibriumOK:true,index:0,label:"D",result:{members:[member("C1",forces),member("R1",forces)]}},
  {success:true,equilibriumOK:true,index:1,label:"D",result:{members:[member("C1",forces)]}}
 ]);
 assert.equal(out.members.length,2);
 assert.deepEqual(JSON.parse(JSON.stringify(out.members.find(x=>x.memberId==="C1").cases)),["D"]);
 assert.equal(out.acceptedMemberResults,3);
});
