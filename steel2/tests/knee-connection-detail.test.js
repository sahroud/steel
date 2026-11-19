"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const detail=require("../js/knee-connection-detail.js");
function fixture(){
 return {schema:detail.SCHEMA,connectionId:"KNEE-01",jointId:"EAVE-1",drawingReference:"DWG-S-101-REV2",units:"mm",
  connectionFrame:{originM:[0,6,0],axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},verifiedByDrawing:true},
  memberForceTransferPoints:[{memberId:"COL-1",pointMm:[0,0,0]},{memberId:"RAF-1",pointMm:[120,0,0]}],
  plates:[{id:"END-PLATE",thicknessMm:16,material:{grade:"ST37",FyMPa:235,FuMPa:360},
   polygonMm:[{x:-100,y:-100},{x:300,y:-100},{x:300,y:100},{x:-100,y:100}]}],
  bolts:[{id:"B1",xMm:0,yMm:-40,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1},
   {id:"B2",xMm:0,yMm:40,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1}],
  welds:[{id:"W1",startMm:[-100,-60,0],endMm:[-100,60,0],type:"fillet",legSizeMm:8,electrodeFexxMPa:490}]};
}
test("explicit connection detail accepts complete, drawing-referenced geometry",()=>{
 const r=detail.validate(fixture());assert.equal(r.valid,true);assert.equal(r.capacityDesigned,false);assert.equal(r.executionReady,false);
});
test("connection detail rejects missing drawing, geometry and material values",()=>{
 const d=fixture();delete d.drawingReference;d.plates[0].thicknessMm=null;d.bolts[0].FuMPa=null;d.welds[0].electrodeFexxMPa=null;
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.length>=4);
});
test("bolt holes must lie within a plate and not cross its edge",()=>{
 const d=fixture();d.bolts[0].xMm=290;d.bolts[0].holeDiameterMm=30;
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("مرز ورق")));
});
test("connection axes must be orthonormal and right-handed",()=>{
 const d=fixture();d.connectionFrame.axes.z=[0,0,-1];
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("راست‌گرد")));
});
test("self-intersecting plate polygons are rejected",()=>{
 const d=fixture();d.plates[0].polygonMm=[{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}];
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("خودمتقاطع")));
});
test("coincident bolts and zero-length welds are rejected",()=>{
 const d=fixture();d.bolts[1].xMm=d.bolts[0].xMm;d.bolts[1].yMm=d.bolts[0].yMm;d.welds[0].endMm=d.welds[0].startMm.slice();
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("مختصات یکسان")));assert.ok(r.errors.some(x=>x.includes("دو نقطه")));
});
test("no connection capacity or execution approval is inferred",()=>{
 const d=fixture();const r=detail.validate(d);assert.equal(r.capacityDesigned,false);assert.equal(r.executionReady,false);assert.equal(r.geometryOnly,true);
});
