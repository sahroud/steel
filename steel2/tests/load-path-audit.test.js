"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const seismic=require("../js/seismic-load-path.js");
const audit=require("../js/load-path-audit.js");

test("approved seismic base shear distributes by supplied verified weights and conserves resultant",()=>{
 const r=seismic.distributeApprovedBaseShear({baseShearKN:120,axisIndex:0,sourceVerified:true,sourceReference:"محاسبه مصوب پروژه / برگ S-01",
  points:[{nodeId:"R1",weight:1},{nodeId:"R2",weight:2},{nodeId:"R3",weight:3}]});
 assert.equal(r.nodalLoads.length,3);
 assert.ok(Math.abs(r.nodalLoads.reduce((s,x)=>s+x.values[0],0)-120000)<1e-8);
 assert.deepEqual(r.nodalLoads.map(x=>x.values[0]),[20000,40000,60000]);
 assert.equal(r.codeDesignApproved,false);
});
test("seismic distribution rejects missing approval, bad weights and duplicate nodes",()=>{
 assert.throws(()=>seismic.distributeApprovedBaseShear({baseShearKN:100,axisIndex:0,points:[{nodeId:"A",weight:1}]}),/منبع مستند/);
 assert.throws(()=>seismic.distributeApprovedBaseShear({baseShearKN:100,axisIndex:0,sourceVerified:true,sourceReference:"ref",points:[{nodeId:"A",weight:0}]}),/مثبت/);
 assert.throws(()=>seismic.distributeApprovedBaseShear({baseShearKN:100,axisIndex:0,sourceVerified:true,sourceReference:"ref",points:[{nodeId:"A",weight:1},{nodeId:"A",weight:2}]}),/تکراری/);
});
test("load-path audit independently verifies steel self-weight and connected path to base",()=>{
 const model={nodes:[{id:"B",x:0,y:0,z:0},{id:"T",x:0,y:3,z:0}],members:[{id:"C1",start:"B",end:"T",sectionKey:"column",lineLoads:{dead:0}}]};
 const sections={C1:{A:0.01}};
 const total=0.01*78.5*1*3;
 const result={selfWeight:{deadLoadFactor:1,totalKN:total,memberCount:1}};
 const r=audit.audit({model,result,sectionsByMemberId:sections,supports:[{nodeId:"B"}],loadCase:"dead"});
 assert.equal(r.success,true);
 assert.ok(Math.abs(r.selfWeight.expectedKN-total)<1e-12);
 assert.equal(r.readyForCodeDesign,false);
});
test("load-path audit blocks disconnected members and duplicate roof dead load",()=>{
 const model={nodes:[{id:"B",x:0,y:0,z:0},{id:"T",x:0,y:3,z:0},{id:"X",x:4,y:0,z:0},{id:"Y",x:4,y:3,z:0},{id:"Q",x:8,y:0,z:0}],
 members:[
  {id:"C1",start:"B",end:"T",sectionKey:"column",lineLoads:{}},
  {id:"P1",start:"T",end:"Y",sectionKey:"roofPurlin",lineLoads:{}},
  {id:"R1",start:"T",end:"Y",sectionKey:"rafter",lineLoads:{dead:1}},
  {id:"ISOLATED",start:"X",end:"Q",sectionKey:"wallGirt",lineLoads:{}}
 ]};
 const sections={C1:{A:.01},P1:{A:.01},R1:{A:.01},ISOLATED:{A:.01}};
 const r=audit.audit({model,result:{selfWeight:{deadLoadFactor:0}},sectionsByMemberId:sections,supports:[{nodeId:"B"}],loadCase:"dead"});
 assert.equal(r.success,false);
 assert.ok(r.blockers.some(x=>x.includes("راه ندارد")));
 assert.ok(r.blockers.some(x=>x.includes("دوباره‌شماری")));
});
test("crane load case without physical runway members is blocked",()=>{
 const model={nodes:[{id:"B",x:0,y:0,z:0}],members:[]};
 const r=audit.audit({model,result:{selfWeight:{deadLoadFactor:0},externalLoadSource:"manufacturer sheet"},sectionsByMemberId:{},supports:[{nodeId:"B"}],loadCase:"crane"});
 assert.ok(r.blockers.some(x=>x.includes("تیر حمال")));
});
