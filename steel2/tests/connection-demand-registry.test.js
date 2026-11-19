"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const registry=require("../js/connection-demand-registry.js");
require("../js/member-demand-3d.js");
const demand=globalThis.SahroudMemberDemand3D;
function fixture(){
 const model={nodes:[
  {id:"B",x:0,y:0,z:0,kind:"base"},
  {id:"E",x:0,y:6,z:0,kind:"eave"},
  {id:"R",x:6,y:7,z:0,kind:"ridge"}
 ],members:[
  {id:"C1",start:"B",end:"E",length:6,sectionKey:"column"},
  {id:"R1",start:"E",end:"R",length:Math.sqrt(37),sectionKey:"rafter"}
 ]};
 const mk=(id,L)=>({id,length:L,localEndForces:Array(12).fill(0),localAxes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},analysisLoad:{uniformLocal:[0,0,0]}});
 const analysis={success:true,members:[mk("C1",6),mk("R1",Math.sqrt(37))]};
 return {model,run:{success:true,caseCount:1,combinationResults:[{id:"ULS-1",label:"1.2D+1.6L",analysis}]}};
}
test("joint registry transfers concurrent end actions and identifies knee/base joints",()=>{
 const {model,run}=fixture();
 const out=registry.build(run,model,demand);
 assert.equal(out.success,true);
 assert.equal(out.source.combinationCount,1);
 assert.ok(out.joints.some(j=>j.nodeId==="E"&&j.families.includes("knee")));
 assert.ok(out.joints.some(j=>j.nodeId==="B"&&j.families.includes("basePlate")));
 const knee=out.joints.find(j=>j.nodeId==="E");
 assert.equal(knee.cases[0].memberActions.length,2);
 assert.equal(knee.capacityDesigned,false);
 assert.equal(knee.executionReady,false);
});
test("joint registry refuses missing combinations and disconnected member nodes",()=>{
 const {model,run}=fixture();
 assert.throws(()=>registry.build({...run,combinationResults:[]},model,demand),/کامل همه ترکیبات/);
 const broken={...model,members:[...model.members,{id:"BAD",start:"MISSING",end:"E",length:1,sectionKey:"brace"}]};
 assert.throws(()=>registry.build(run,broken,demand),/گره معتبر/);
});
test("classification does not invent crane rail joints without crane members",()=>{
 const {model}=fixture();
 const families=registry.classify(model.nodes[1],model.members.filter(m=>m.start==="E"||m.end==="E"));
 assert.ok(families.includes("knee"));
 assert.ok(!families.includes("craneRail"));
});
