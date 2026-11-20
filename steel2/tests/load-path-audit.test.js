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
 const configuration=crane.createConfiguration({capacityTonnes:5,enabled:true,craneSpanM:12,runwayLengthM:36,hookLiftM:5,
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
  wallDeadSupportPath:"girts",wallDeadLeft:.8,wallDeadRight:1.2,endWallDeadFront:1.4,endWallDeadBack:1.6,
  windWall:0,windEndFront:0,windEndBack:0,
  deadAreaBasis:"unspecified",liveAreaBasis:"unspecified",snowAreaBasis:"unspecified"
 });
 const actual=members.map(m=>m.lineLoads.dead),expected=[1.6,1.8,1.4,2.0];
 actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<1e-12));
 assert.equal(r.roofPurlinsPresent,false);
});

test("foundation-bearing wall weight is not silently assigned to steel girts",()=>{
 const members=[{id:"WL",sectionKey:"wallGirt",side:"left",tributaryHeight:2},
  {id:"EF",sectionKey:"endGirt",endFace:"front",tributaryHeight:1}];
 global.SteelStructuralModel.assignGeometricMemberLineLoads(members,{span:12,rise:2},[3],{
  wallDeadSupportPath:"foundation",wallDeadLeft:1.5,endWallDeadFront:2,
  wallDeadRight:0,endWallDeadBack:0,windWall:0,windEndFront:0,windEndBack:0,
  deadAreaBasis:"unspecified",liveAreaBasis:"unspecified",snowAreaBasis:"unspecified"
 });
 assert.deepEqual(members.map(m=>m.lineLoads.dead),[0,0]);
});

test("seismic lateral distribution rejects vertical axis",()=>{
 assert.throws(()=>seismic.distributeApprovedBaseShear({baseShearKN:50,axisIndex:1,sourceVerified:true,sourceReference:"S-01",points:[{nodeId:"R",weight:1}]}),/محور افقی/);
});


test("roof purlin, longitudinal wall girt and end-wall girt loads reach the 3D solver with conserved resultants",()=>{
 global.window=global;
 global.document=global.document||{readyState:"loading",addEventListener(){},getElementById(){return null},querySelectorAll(){return[]}};
 require("../js/load-transfer.js");
 require("../js/model-3d.js");
 require("../js/analysis-3d.js");
 const structural=global.SteelStructuralModel,solver=global.SteelFrame3D;
 assert.ok(structural&&solver);
 const members=[
  {id:"P-LEFT",sectionKey:"roofPurlin",side:"left",tributaryWidth:1.2},
  {id:"WG-LEFT",sectionKey:"wallGirt",side:"left",tributaryHeight:1.5},
  {id:"EG-FRONT",sectionKey:"endGirt",endFace:"front",tributaryHeight:1.5}
 ];
 const loads={
  deadLeft:0.4,deadRight:0.4,liveLeft:0,liveRight:0,snowLeft:0,snowRight:0,
  windLeft:0.6,windRight:-0.4,windWall:0.5,windEndFront:-0.3,windEndBack:0,
  wallDeadSupportPath:"girts",wallDeadLeft:0.8,wallDeadRight:0,
  endWallDeadFront:0.7,endWallDeadBack:0,
  deadAreaBasis:"sloped-surface",liveAreaBasis:"horizontal-projection",snowAreaBasis:"horizontal-projection"
 };
 structural.assignGeometricMemberLineLoads(members,{span:12,rise:2,length:6,height:4},[6],loads);
 assert.ok(Math.abs(members[0].lineLoads.dead-0.48)<1e-12);
 assert.ok(Math.abs(members[1].lineLoads.dead-1.2)<1e-12);
 assert.ok(Math.abs(members[2].lineLoads.dead-1.05)<1e-12);
 const nodes=[
  {id:"P-I",x:2,y:4.6666666667,z:0},{id:"P-J",x:2,y:4.6666666667,z:6},
  {id:"W-I",x:0,y:2,z:0},{id:"W-J",x:0,y:2,z:6},
  {id:"E-I",x:0,y:2,z:0},{id:"E-J",x:12,y:2,z:0}
 ];
 const pairs=[["P-I","P-J"],["W-I","W-J"],["E-I","E-J"]];
 members.forEach((member,index)=>{
  const [start,end]=pairs[index],a=nodes.find(n=>n.id===start),b=nodes.find(n=>n.id===end);
  const wind=structural.windMemberLineLoadGlobal(member,{span:12,rise:2},1,1);
  const globalLoad=[wind[0]*1000,(wind[1]-Number(member.lineLoads.dead||0))*1000,wind[2]*1000];
  const local=solver.globalVectorToLocal([a.x,a.y,a.z],[b.x,b.y,b.z],globalLoad,member.sectionKey==="endGirt"?[0,1,0]:[1,0,0],0);
  member.start=start;member.end=end;
  member.referenceAxis=member.sectionKey==="endGirt"?[0,1,0]:[1,0,0];
  member.sectionRollDeg=0;
  member.analysisLoad={uniformLocal:local};
 });
 const section={E:200e9,G:80e9,A:0.012,Iy:2.5e-5,Iz:7.5e-5,J:1.8e-6};
 const supports=nodes.map(n=>({nodeId:n.id,fixedDofs:n.id.endsWith("-I")?[0,1,2,3,4,5]:[0,1,2]}));
 const result=solver.analyze({nodes,members},{sectionResolver:()=>section,supports});
 assert.equal(result.success,true);
 assert.equal(result.loadAssemblyAudit.ok,true);
 assert.equal(result.equilibrium.ok,true);
 assert.equal(result.memberCount,3);
 const purlinWind=structural.windMemberLineLoadGlobal(members[0],{span:12,rise:2},1,1);
 const expectedVerticalReactionKN=(0.48-purlinWind[1])*6+1.2*6+1.05*12;
 const reactionsY=result.reactions.reduce((sum,r)=>sum+Number(r.values[1]||0),0);
 assert.ok(Math.abs(reactionsY/1000-expectedVerticalReactionKN)<1e-7);
 const expectedWindXKN=structural.windMemberLineLoadGlobal(members[0],{span:12,rise:2},1,1)[0]*6+
  structural.windMemberLineLoadGlobal(members[1],{span:12,rise:2},1,1)[0]*6;
 const reactionsX=result.reactions.reduce((sum,r)=>sum+Number(r.values[0]||0),0);
 assert.ok(Math.abs(reactionsX/1000+expectedWindXKN)<1e-7);
 assert.ok(result.members.every(m=>m.localEndForces.length===12));
});


test("triangular end-wall wind reaches the 3D solver with conserved force and base moment for both signs",()=>{
 global.window=global;
 global.document=global.document||{readyState:"loading",addEventListener(){},getElementById(){return null},querySelectorAll(){return[]}};
 require("../js/load-transfer.js");
 require("../js/analysis-3d.js");
 const transfer=global.SteelLoadTransfer,solver=global.SteelFrame3D;
 assert.ok(solver&&typeof solver.analyze==="function");
 const span=12,rise=2,eave=4,pressure=0.75,intervals=3,zFace=0;
 const section={E:200e9,G:80e9,A:0.012,Iy:2.5e-5,Iz:7.5e-5,J:1.8e-6};
 for(const sign of [1,-1]){
  const actions=transfer.triangularGablePostEquivalentLoads(
   pressure*sign,span,rise,eave,intervals
  );
  const nodes=[],members=[],nodalLoads=[];
  actions.forEach(action=>{
   const baseId="B"+action.post,headId="H"+action.post;
   nodes.push({id:baseId,x:action.xM,y:0,z:zFace},{id:headId,x:action.xM,y:action.supportHeightM,z:zFace});
   members.push({id:"C"+action.post,start:baseId,end:headId,sectionKey:"column"});
   nodalLoads.push(
    {nodeId:baseId,values:[0,0,action.baseForceKN*1000,0,action.momentYAboutSupportKNm*1000,0]},
    {nodeId:headId,values:[0,0,action.topForceKN*1000,0,0,0]}
   );
  });
  const supports=actions.map(action=>({nodeId:"B"+action.post,fixedDofs:[0,1,2,3,4,5]}));
  const result=solver.analyze({nodes,members},{sectionResolver:()=>section,supports,nodalLoads});
  assert.equal(result.success,true);
  assert.equal(result.loadAssemblyAudit.ok,true);
  assert.equal(result.equilibrium.ok,true);
  const appliedFz=nodalLoads.reduce((sum,load)=>sum+load.values[2],0)/1000;
  const appliedMy=nodalLoads.reduce((sum,load)=>sum+load.values[4],0)/1000-
   nodalLoads.reduce((sum,load)=>{
    const node=nodes.find(n=>n.id===load.nodeId);
    return sum+node.x*load.values[2];
   },0)/1000;
  const analytic=transfer.triangularGableWindResultant(pressure*sign,span,rise);
  const actionMy=actions.reduce((sum,action)=>sum+action.momentYAboutSupportKNm-action.xM*action.resultantKN,0);
  const analyticMy=-pressure*sign*(span*span*rise/4);
  assert.ok(Math.abs(appliedFz-analytic.resultantKN)<1e-9);
  assert.ok(Math.abs(appliedMy-actionMy)<1e-9,JSON.stringify({appliedMy,actionMy}));
  assert.ok(Math.abs(actionMy-analyticMy)<1e-9,JSON.stringify({actionMy,analyticMy}));
  assert.ok(Math.abs(result.equilibrium.appliedForce[2]/1000-appliedFz)<1e-7);
  assert.ok(Math.abs(result.equilibrium.appliedMoment[1]/1000000-appliedMy)<1e-7);
  assert.equal(result.reactions.length,actions.length);
  const reactionFz=result.reactions.reduce((sum,reaction)=>sum+Number(reaction.values[2]||0),0)/1000;
  assert.ok(Math.abs(reactionFz+appliedFz)<1e-7);
 }
});
