"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const detail=require("../js/knee-connection-detail.js");
const registry=require("../js/connection-demand-registry.js");
const mapper=require("../js/knee-connection-demand-mapper.js");
function fixture(){
 const d={schema:detail.SCHEMA,connectionId:"KNEE-01",jointId:"E",drawingReference:"DWG-A1",units:"mm",
 connectionFrame:{originM:[0,6,0],axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},verifiedByDrawing:true},
 memberForceTransferPoints:[{role:"column",memberId:"C1",pointMm:[0,0,0]},{role:"rafter",memberId:"R1",pointMm:[100,0,0]}],
 plates:[{id:"P1",thicknessMm:12,material:{grade:"ST37",FyMPa:235,FuMPa:360},frame:{originMm:[0,0,0],axes:{u:[1,0,0],v:[0,1,0],n:[0,0,1]}},polygonMm:[{x:-100,y:-100},{x:200,y:-100},{x:200,y:100},{x:-100,y:100}]}],
 bolts:[{id:"B1",plateId:"P1",xMm:0,yMm:0,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1}],
 welds:[{id:"W1",plateId:"P1",faceReference:"DWG-A1/FACE-1",startMm:[0,0,0],endMm:[0,50,0],type:"fillet",legSizeMm:6,electrodeFexxMPa:490}]};
 const g={node:{id:"E"},column:{id:"C1"},rafter:{id:"R1"}};
 const demand={success:true,joints:[{nodeId:"E",coordinatesM:{x:0,y:6,z:0},cases:[{combinationId:"U1",combination:"1.2D+1.6L",memberActions:[
  {memberId:"C1",end:"j",global:{Fx:1000,Fy:0,Fz:0,Mx:0,My:0,Mz:0}},
  {memberId:"R1",end:"i",global:{Fx:0,Fy:2000,Fz:0,Mx:0,My:0,Mz:0}}]}]}]};
 return{d,g,demand};
}
test("maps signed member actions to the drawing-defined connection origin per combination",()=>{
 const {d,g,demand}=fixture();const r=mapper.map(d,demand,g);
 assert.equal(r.success,true);assert.equal(r.cases.length,1);assert.equal(r.cases[0].memberActions.length,2);
 assert.equal(r.cases[0].memberActions[0].connectionFrame.globalAtConnectionOrigin.Mz,0);
 assert.equal(r.capacityDesigned,false);assert.equal(r.executionReady,false);
});
test("moment transfer includes the signed force lever arm",()=>{
 const {d,g,demand}=fixture();d.connectionFrame.originM=[0,5,0];
 const r=mapper.map(d,demand,g);
 assert.equal(r.cases[0].memberActions[0].connectionFrame.globalAtConnectionOrigin.Mz,-1000);
});
test("rejects a joint or member mismatch instead of mapping another connection",()=>{
 const {d,g,demand}=fixture();d.jointId="OTHER";
 assert.throws(()=>mapper.map(d,demand,g),/گره زانویی/);
});
test("rejects missing member actions in any combination",()=>{
 const {d,g,demand}=fixture();demand.joints[0].cases[0].memberActions.pop();
 assert.throws(()=>mapper.map(d,demand,g),/دقیقاً یک کنش/);
});
test("rejects incomplete or unvalidated connection geometry",()=>{
 const {d,g,demand}=fixture();d.plates=[];
 assert.throws(()=>mapper.map(d,demand,g),/جزئیات اتصال معتبر نیست/);
});
