"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const detail=require("../js/knee-connection-detail.js");
const check=require("../js/knee-connection-weld-detail-check.js");
function fixture(weldOverrides={}){
 const d={schema:detail.SCHEMA,connectionId:"K1",jointId:"E",drawingReference:"DWG-1",units:"mm",
 connectionFrame:{originM:[0,0,0],axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},verifiedByDrawing:true},
 memberForceTransferPoints:[{role:"column",memberId:"C1",pointMm:[0,0,0]},{role:"rafter",memberId:"R1",pointMm:[0,0,0]}],
 plates:[{id:"P1",thicknessMm:10,thicknessReference:"mid-plane",material:{grade:"ST37",FyMPa:235,FuMPa:360},
 frame:{originMm:[0,0,0],axes:{u:[1,0,0],v:[0,1,0],n:[0,0,1]}},
 polygonMm:[{x:-100,y:-100},{x:100,y:-100},{x:100,y:100},{x:-100,y:100}]}],
 bolts:[{id:"B1",plateId:"P1",xMm:0,yMm:0,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,
 axisConnectionFrame:[0,0,1],gripLengthMm:36,axisVerifiedByDrawing:true,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1}],
 welds:[{id:"W1",plateId:"P1",faceReference:"DWG-1/F1",startMm:[-50,0,0],endMm:[50,0,0],
 type:"fillet",legSizeMm:6,electrodeFexxMPa:490,connectedPartThicknessMm:8,highCycleDynamic:false,
 edgeWeld:false,continuity:"continuous",axialEndConnection:false,longitudinallyLoaded:false,...weldOverrides}]};
 return d;
}
test("uses the Part 10 minimum fillet leg table at exact thickness boundaries",()=>{
 assert.equal(check.minLeg(6),3);
 assert.equal(check.minLeg(6.001),5);
 assert.equal(check.minLeg(12),5);
 assert.equal(check.minLeg(12.001),6);
 assert.equal(check.minLeg(20),6);
 assert.equal(check.minLeg(20.001),8);
});
test("passes a weld meeting minimum leg and effective length rules",()=>{
 const r=check.assess(fixture());
 assert.equal(r.overallStatus,"PASS");
 assert.ok(r.checks.every(x=>x.status==="PASS"||x.status==="NOT_APPLICABLE"));
 assert.equal(r.lineDemandGeometryComplete,true);
});
test("fails when leg size is below the thinner-part minimum or exceeds thinner-part thickness",()=>{
 const d=fixture({legSizeMm:2,connectedPartThicknessMm:4});
 const r=check.assess(d);
 assert.equal(r.overallStatus,"FAIL");
 assert.equal(r.checks.find(x=>x.checkId==="minimum-leg").status,"FAIL");
});
test("raises the minimum leg to 5 mm for high-cycle dynamic loading",()=>{
 const r=check.assess(fixture({legSizeMm:4,highCycleDynamic:true}));
 assert.equal(r.checks.find(x=>x.checkId==="minimum-leg").requiredLegMm,5);
 assert.equal(r.checks.find(x=>x.checkId==="minimum-leg").status,"FAIL");
});
test("checks maximum edge-weld size using the explicitly identified edge part",()=>{
 const r=check.assess(fixture({edgeWeld:true,edgePart:"host",legSizeMm:6}));
 const row=r.checks.find(x=>x.checkId==="maximum-edge-leg");
 assert.equal(row.status,"PASS");
 assert.equal(row.maximumLegMm,8);
});
test("rejects an edge-weld size exceeding the code limit",()=>{
 const r=check.assess(fixture({edgeWeld:true,edgePart:"host",legSizeMm:9}));
 assert.equal(r.checks.find(x=>x.checkId==="maximum-edge-leg").status,"FAIL");
});
test("does not invent a maximum edge-weld rule at exactly 6 mm plate thickness",()=>{
 const d=fixture({edgeWeld:true,edgePart:"host"});
 d.plates[0].thicknessMm=6;
 const r=check.assess(d);
 assert.equal(r.checks.find(x=>x.checkId==="maximum-edge-leg").status,"NOT_ASSESSABLE");
});
test("checks minimum length of intermittent weld segments as max(4a,40 mm)",()=>{
 const r=check.assess(fixture({continuity:"intermittent",startMm:[0,0,0],endMm:[30,0,0]}));
 const row=r.checks.find(x=>x.checkId==="minimum-effective-length");
 assert.equal(row.requiredLengthMm,40);
 assert.equal(row.status,"FAIL");
});
test("applies beta reduction to a longitudinally loaded axial end weld longer than 100a",()=>{
 const d=fixture({startMm:[0,0,0],endMm:[1000,0,0],axialEndConnection:true,longitudinallyLoaded:true});
 d.plates[0].polygonMm=[{x:-1100,y:-100},{x:1100,y:-100},{x:1100,y:100},{x:-1100,y:100}];
 const r=check.assess(d);
 const row=r.checks.find(x=>x.checkId==="long-weld-reduction");
 assert.equal(row.status,"PASS");
 assert.equal(row.beta,1.0); // beta=1.2-0.002(1000/6), capped at 1.0
 assert.ok(Math.abs(r.effectiveWelds[0].effectiveLengthMm-(1000*(1.2-0.002*(1000/6))))<1e-8);
});
test("flags unknown long-weld applicability and blocks effective-length demand mapping",()=>{
 const d=fixture({startMm:[0,0,0],endMm:[1000,0,0],axialEndConnection:undefined,longitudinallyLoaded:undefined});
 d.plates[0].polygonMm=[{x:-1100,y:-100},{x:1100,y:-100},{x:1100,y:100},{x:-1100,y:100}];
 const r=check.assess(d);
 assert.equal(r.checks.find(x=>x.checkId==="long-weld-reduction").status,"NOT_ASSESSABLE");
 assert.equal(r.lineDemandGeometryComplete,false);
});
test("rejects invalid base detail without claiming a weld check",()=>{
 const d=fixture();d.plates=[];
 const r=check.assess(d);
 assert.equal(r.success,false);assert.equal(r.overallStatus,"INCOMPLETE");
});

test("fails when a weld leg exceeds the thinner connected part thickness",()=>{
 const r=check.assess(fixture({legSizeMm:6,connectedPartThicknessMm:4}));
 assert.equal(r.checks.find(x=>x.checkId==="minimum-leg").status,"FAIL");
});
