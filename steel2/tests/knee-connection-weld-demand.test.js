"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const detailApi=require("../js/knee-connection-detail.js");
require("../js/connection-weld-demand.js");
const kneeWeld=require("../js/knee-connection-weld-demand.js");
function fixture(){
 const d={schema:detailApi.SCHEMA,connectionId:"K1",jointId:"E",drawingReference:"DWG-1",units:"mm",
 connectionFrame:{originM:[0,0,0],axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},verifiedByDrawing:true},
 memberForceTransferPoints:[{role:"column",memberId:"C1",pointMm:[0,0,0]},{role:"rafter",memberId:"R1",pointMm:[0,0,0]}],
 plates:[{id:"P1",thicknessMm:12,thicknessReference:"mid-plane",material:{grade:"ST37",FyMPa:235,FuMPa:360},
 frame:{originMm:[0,0,0],axes:{u:[1,0,0],v:[0,1,0],n:[0,0,1]}},
 polygonMm:[{x:-100,y:-100},{x:100,y:-100},{x:100,y:100},{x:-100,y:100}]}],
 bolts:[{id:"B1",plateId:"P1",xMm:0,yMm:0,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,
 axisConnectionFrame:[0,0,1],gripLengthMm:36,axisVerifiedByDrawing:true,holeType:"standard",
 threadsInShearPlane:true,shearPlaneCount:1}],
 welds:[{id:"W1",plateId:"P1",faceReference:"DWG-1/F1",startMm:[-50,-50,0],endMm:[50,-50,0],type:"fillet",legSizeMm:6,electrodeFexxMPa:490},
 {id:"W2",plateId:"P1",faceReference:"DWG-1/F1",startMm:[50,-50,0],endMm:[50,50,0],type:"fillet",legSizeMm:6,electrodeFexxMPa:490}]};
 const mapped={success:true,connectionId:"K1",cases:[{combinationId:"U1",combination:"ULS-1",memberActions:[
 {memberId:"C1",role:"column",connectionFrame:{force:{x:10000,y:0,z:0},moment:{x:0,y:0,z:0}}},
 {memberId:"R1",role:"rafter",connectionFrame:{force:{x:0,y:20000,z:0},moment:{x:0,y:0,z:0}}}
 ]}]};
 return{d,mapped};
}
test("maps coplanar weld segments to separate signed member demand scenarios",()=>{
 const {d,mapped}=fixture();const r=kneeWeld.analyze(d,mapped);
 assert.equal(r.success,true);assert.equal(r.results.length,2);
 assert.equal(r.results[0].demandAtPlateOrigin.N,10);
 assert.equal(r.results[1].demandAtPlateOrigin.V,20);
 assert.equal(r.capacityDesigned,false);
 assert.deepEqual(r.units,{force:"kN",moment:"kN.mm",coordinates:"mm",lineDemand:"kN/mm"});
});
test("rejects out-of-plane force or bending rather than dropping it",()=>{
 const {d,mapped}=fixture();mapped.cases[0].memberActions[0].connectionFrame.force.z=100;
 assert.throws(()=>kneeWeld.analyze(d,mapped),/خارج از صفحه/);
});
test("rejects weld segments on different plate planes",()=>{
 const {d,mapped}=fixture();d.plates.push({...d.plates[0],id:"P2",frame:{originMm:[0,0,5],axes:{u:[1,0,0],v:[0,1,0],n:[0,0,1]}}});
 d.welds[1].plateId="P2";d.welds[1].startMm=[50,-50,5];d.welds[1].endMm=[50,50,5];
 assert.throws(()=>kneeWeld.analyze(d,mapped),/صفحه مرجع|صفحات/);
});
test("rejects a mismatched connection identifier",()=>{
 const {d,mapped}=fixture();mapped.connectionId="OTHER";
 assert.throws(()=>kneeWeld.analyze(d,mapped),/شناسه اتصال/);
});
test("shifts moment from connection origin to weld-group plane origin",()=>{
 const {d,mapped}=fixture();d.plates[0].frame.originMm=[0,100,0];
 d.welds.forEach(w=>{w.startMm[1]+=100;w.endMm[1]+=100;});
 mapped.cases[0].memberActions[0].connectionFrame.force={x:10000,y:0,z:0};
 const r=kneeWeld.analyze(d,mapped);
 // r_conn-r_plate = [0,-100,0]; cross F = +1,000,000 N.mm = +1000 kN.mm
 assert.equal(r.results[0].demandAtPlateOrigin.Mz,1000);
});
