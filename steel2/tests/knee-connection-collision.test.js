"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const detail=require("../js/knee-connection-detail.js");
const collision=require("../js/knee-connection-collision.js");
function fixture(){
 return {schema:detail.SCHEMA,connectionId:"KNEE-COLLISION-01",jointId:"EAVE-1",drawingReference:"DWG-S-101-REV2",units:"mm",
  connectionFrame:{originM:[0,6,0],axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},verifiedByDrawing:true},
  memberForceTransferPoints:[{role:"column",memberId:"COL-1",pointMm:[0,0,0]},{role:"rafter",memberId:"RAF-1",pointMm:[120,0,0]}],
  plates:[{id:"P1",thicknessMm:16,thicknessReference:"mid-plane",material:{grade:"ST37",FyMPa:235,FuMPa:360},
   frame:{originMm:[0,0,0],axes:{u:[1,0,0],v:[0,1,0],n:[0,0,1]}},
   polygonMm:[{x:-100,y:-100},{x:100,y:-100},{x:100,y:100},{x:-100,y:100}]}],
  bolts:[{id:"B1",plateId:"P1",xMm:0,yMm:-40,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,axisConnectionFrame:[0,0,1],gripLengthMm:36,axisVerifiedByDrawing:true,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1},
   {id:"B2",plateId:"P1",xMm:0,yMm:40,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,axisConnectionFrame:[0,0,1],gripLengthMm:36,axisVerifiedByDrawing:true,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1}],
  welds:[{id:"W1",plateId:"P1",faceReference:"DWG-S-101-REV2/DETAIL-A",startMm:[-100,-60,0],endMm:[-100,60,0],type:"fillet",legSizeMm:8,electrodeFexxMPa:490}]};
}
function addParallelPlate(d,id,z){
 const p=JSON.parse(JSON.stringify(d.plates[0]));p.id=id;p.frame.originMm[2]=z;d.plates.push(p);
 d.bolts.push({...d.bolts[0],id:id+"-B1",plateId:id},{...d.bolts[1],id:id+"-B2",plateId:id});
 d.welds.push({...d.welds[0],id:id+"-W1",plateId:id,startMm:[-100,-60,z],endMm:[-100,60,z]});
}
test("identical coplanar plate solids are reported as positive-volume overlap",()=>{
 const d=fixture();addParallelPlate(d,"P2",0);
 const r=collision.audit(d);
 assert.equal(r.overlapCount,1);assert.equal(r.pairs[0].state,"overlap");
 assert.ok(r.pairs[0].minimumPenetrationMm>15.9);
 assert.equal(r.capacityDesigned,false);assert.equal(r.executionReady,false);
});
test("face-to-face plates sharing one surface are contact, not overlap",()=>{
 const d=fixture();addParallelPlate(d,"P2",16);
 const r=collision.audit(d);
 assert.equal(r.contactCount,1);assert.equal(r.pairs[0].state,"contact");
});
test("separated parallel plates are reported clear",()=>{
 const d=fixture();addParallelPlate(d,"P2",17);
 const r=collision.audit(d);
 assert.equal(r.clearCount,1);assert.equal(r.pairs[0].state,"clear");
 assert.ok(Number.isFinite(r.pairs[0].minimumPenetrationMm));assert.ok(r.pairs[0].minimumPenetrationMm<0);
});
test("orthogonal intersecting plates are detected by 3D separating-axis tests",()=>{
 const d=fixture();
 const p=JSON.parse(JSON.stringify(d.plates[0]));p.id="P2";
 p.frame={originMm:[0,0,0],axes:{u:[0,0,1],v:[0,1,0],n:[-1,0,0]}};
 p.polygonMm=[{x:-100,y:-100},{x:100,y:-100},{x:100,y:100},{x:-100,y:100}];
 d.plates.push(p);
 d.bolts.push({...d.bolts[0],id:"P2-B1",plateId:"P2"},{...d.bolts[1],id:"P2-B2",plateId:"P2"});
 d.welds.push({...d.welds[0],id:"P2-W1",plateId:"P2",startMm:[0,-60,-60],endMm:[0,-60,60]});
 const r=collision.audit(d);
 assert.equal(r.pairs[0].state,"overlap");
});
test("collision audit rejects invalid geometry and invalid tolerance",()=>{
 const d=fixture();d.plates[0].thicknessMm=0;
 assert.throws(()=>collision.audit(d),/برای ممیزی برخورد معتبر نیست/);
 assert.throws(()=>collision.audit(fixture(),{toleranceMm:-1}),/تلرانس تماس/);
});

test("bolt shank geometry follows explicit axis and grip length",()=>{
 const d=fixture();const g=detail.buildGlobalGeometry(d);
 const bolt=g.plates[0].bolts[0];
 assert.deepEqual(bolt.shank.startGlobalM,[0,5.96,-0.018]);
 assert.deepEqual(bolt.shank.endGlobalM,[0,5.96,0.018]);
 assert.equal(bolt.shank.radiusMm,10);
});

test("bolt head touching the declared plate face is contact with unverified intent, not interference",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[{id:"HEAD-1",kind:"head",centerOffsetMm:14,thicknessMm:12,acrossFlatsMm:30}];
 const r=collision.audit(d);
 const p=r.hardwarePlatePairs.find(x=>x.hardwareId==="HEAD-1"&&x.plateCompared==="P1");
 assert.equal(p.state,"contact-intent-unverified");assert.equal(p.intentVerified,false);
});
test("bolt nut penetrating the plate solid is classified as hardware interference",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[{id:"NUT-1",kind:"nut",centerOffsetMm:0,thicknessMm:16,acrossFlatsMm:30}];
 const r=collision.audit(d);
 const p=r.hardwarePlatePairs.find(x=>x.hardwareId==="NUT-1"&&x.plateCompared==="P1");
 assert.equal(p.state,"interference");
});
test("washer annulus is evaluated with its inner opening and bolt shank is explicitly not assessable",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[{id:"WASHER-1",kind:"washer",centerOffsetMm:9.5,thicknessMm:3,outerDiameterMm:36,innerDiameterMm:22}];
 const r=collision.audit(d);
 assert.equal(r.hardwarePlatePairs.find(x=>x.hardwareId==="WASHER-1").state,"contact-intent-unverified");
 assert.equal(r.shankStatus.find(x=>x.boltId==="B1").state,"not-assessable");
 assert.match(r.method,/32-sector/);
});
test("hardware on separate bolts is checked against other hardware",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[1].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[{id:"H-A",kind:"head",centerOffsetMm:14,thicknessMm:12,acrossFlatsMm:30}];
 d.bolts[1].hardware=[{id:"H-B",kind:"head",centerOffsetMm:14,thicknessMm:12,acrossFlatsMm:30}];
 const r=collision.audit(d);
 assert.equal(r.hardwarePairs.length,1);
 assert.ok(["interference","contact-intent-unverified","clear"].includes(r.hardwarePairs[0].state));
});
