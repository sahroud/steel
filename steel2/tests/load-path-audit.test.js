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
 assert.equal(r.type,"seismic");
 assert.equal(r.sourceVerified,true);
 assert.equal(r.nodalLoads.length,3);
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

const crane=require("../js/crane-design.js");
test("crane wheel reactions are passed to solver only with verified manufacturer data",()=>{
 const configuration=crane.createConfiguration({capacityTonnes:10,enabled:true,craneSpanM:12,runwayLengthM:36,hookLiftM:6,
  dutyClass:"M4",cyclesPerHour:10,verified:true,manufacturer:"Manufacturer",model:"Model-X",sourceReference:"catalogue.pdf page 12"});
 const result=crane.createVerifiedWheelLoadCase({configuration,sourceVerified:true,sourceReference:"catalogue.pdf page 12",
  wheelReactions:[{nodeId:"CRANE_COL_1",verticalKN:85,longitudinalKN:4,transverseKN:7}]});
 assert.equal(result.type,"crane");
 assert.deepEqual(result.nodalLoads[0].values,[4000,-85000,7000,0,0,0]);
});
test("crane wheel reaction transfer rejects unverified and malformed data",()=>{
 const configuration=crane.createConfiguration({capacityTonnes:5,craneSpanM:12,runwayLengthM:36,hookLiftM:5,
  dutyClass:"M3",cyclesPerHour:5,verified:true,manufacturer:"M",model:"X",sourceReference:"source"});
 assert.throws(()=>crane.createVerifiedWheelLoadCase({configuration,sourceVerified:false,sourceReference:"source",wheelReactions:[{nodeId:"N",verticalKN:10}]}),/منبع معتبر/);
 assert.throws(()=>crane.createVerifiedWheelLoadCase({configuration,sourceVerified:true,sourceReference:"source",wheelReactions:[{nodeId:"N",verticalKN:-10}]}),/محدود/);
});

test("wall surface dead loads transfer to longitudinal and end girts using tributary height",()=>{
 global.window=global;
 global.document={readyState:"loading",addEventListener(){},getElementById(){return null},querySelectorAll(){return[]}};
 require("../js/load-transfer.js");
 require("../js/model-3d.js");
 const members=[
  {id:"WL",sectionKey:"wallGirt",side:"left",tributaryHeight:2},
  {id:"WR",sectionKey:"wallGirt",side:"right",tributaryHeight:1.5},
  {id:"EF",sectionKey:"endGirt",endFace:"front",tributaryHeight:1},
  {id:"EB",sectionKey:"endGirt",endFace:"rear",tributaryHeight:1.25}
 ];
 global.SahroudStructuralModel=global.SteelStructuralModel;
 const r=global.SteelStructuralModel.assignGeometricMemberLineLoads(members,{span:12,rise:2},[3],{
  wallDeadLeft:.8,wallDeadRight:1.2,endWallDeadFront:1.4,endWallDeadBack:1.6,
  windWall:0,windEndFront:0,windEndBack:0,
  deadAreaBasis:"unspecified",liveAreaBasis:"unspecified",snowAreaBasis:"unspecified"
 });
 const actual=members.map(m=>m.lineLoads.dead),expected=[1.6,1.8,1.4,2.0];
 actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<1e-12));
 assert.equal(r.roofPurlinsPresent,false);
});
