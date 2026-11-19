"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const detail=require("../js/knee-connection-detail.js");
const capacity=require("../js/knee-connection-capacity.js");
function detailFixture(){
 return{schema:detail.SCHEMA,connectionId:"KNEE-01",jointId:"EAVE-1",drawingReference:"DWG-01",units:"mm",
  connectionFrame:{originM:[0,6,0],axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},verifiedByDrawing:true},
  memberForceTransferPoints:[{role:"column",memberId:"C1",pointMm:[0,0,0]},{role:"rafter",memberId:"R1",pointMm:[100,0,0]}],
  plates:[{id:"P1",thicknessMm:16,thicknessReference:"mid-plane",material:{grade:"ST37",FyMPa:235,FuMPa:360},
   frame:{originMm:[0,0,0],axes:{u:[1,0,0],v:[0,1,0],n:[0,0,1]}},
   polygonMm:[{x:-100,y:-100},{x:300,y:-100},{x:300,y:100},{x:-100,y:100}]}],
  bolts:[{id:"B1",plateId:"P1",xMm:0,yMm:-40,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,
   axisConnectionFrame:[0,0,1],gripLengthMm:36,axisVerifiedByDrawing:true,holeType:"standard",
   threadsInShearPlane:true,shearPlaneCount:1}],
  welds:[{id:"W1",plateId:"P1",faceReference:"DWG-01/DETAIL-A",startMm:[-100,-60,0],endMm:[-100,60,0],type:"fillet",legSizeMm:8,electrodeFexxMPa:490}]};
}
function designFixture(){
 return{schema:capacity.SCHEMA,method:"LRFD",connectionType:"bearing",drawingReference:"DWG-01",
  boltDemandDistributionVerifiedByEngineer:true,boltDemandDistributionReference:"CALC-01 page 4",
  axialEndConnection:false,boltProperties:[{boltId:"B1",boltClass:"high-strength"}],
  loadCases:[{id:"ULS-1",classification:"ULS",sourceReference:"COMBO-ULS-1",
   pryingAssessment:{status:"not-applicable",reference:"CALC-01 page 5",reason:"طبق مدل تماس و سختی مستند، نیروی اهرمی ایجاد نمی‌شود."},
   boltActions:[{boltId:"B1",tensionKN:10,shearKN:8,pryingTensionKN:0}],
   bearingChecks:[{boltId:"B1",plateId:"P1",shearKN:8,LcMm:30,holeType:"standard"}],
   plateSectionChecks:[{plateId:"P1",tensionKN:10,shearKN:8,AgTensionMm2:1600,AeTensionMm2:1200,AgvMm2:800,AnvMm2:700,areaReference:"DWG-01 / net section S1"}],
   blockShearChecks:[{plateId:"P1",demandKN:12,AgvMm2:500,AnvMm2:400,AntMm2:200,Ubs:1,ubsBasis:"تنش کششی یکنواخت در سطح کششی، CALC-01",pathReference:"DWG-01 / path BS-1"}]}]};
}
test("calculates a drawing-referenced bolt and plate limit-state set without approving the connection",()=>{
 const d=detailFixture(),c=designFixture(),r=capacity.calculate(d,c);
 assert.equal(r.codeEdition,"مبحث دهم مقررات ملی ساختمان، ویرایش پنجم ۱۴۰۱");
 assert.equal(r.capacityChecksCalculated,true);
 assert.equal(r.connectionApproved,false);
 assert.equal(r.executionReady,false);
 assert.equal(r.overallStatus,"INCOMPLETE");
 assert.equal(r.boltChecks.length,1);
 assert.equal(r.bearingChecks.length,1);
 assert.equal(r.plateChecks[0].checks.length,4);
 assert.equal(r.blockShearChecks.length,1);
});
test("bolt nominal tensile and shear resistances use Mabhath 10 factors",()=>{
 const d=detailFixture(),c=designFixture();
 c.loadCases[0].boltActions[0]={boltId:"B1",tensionKN:0,shearKN:0,pryingTensionKN:0};
 const r=capacity.calculate(d,c),b=r.boltChecks[0];
 const Ab=Math.PI*20*20/4;
 assert.ok(Math.abs(b.tension.capacityKN-0.75*0.75*800*Ab/1000)<1e-10);
 assert.ok(Math.abs(b.shear.capacityKN-0.75*0.45*800*Ab/1000)<1e-10);
});
test("high-strength bolt shear resistance distinguishes threaded and unthreaded shear planes",()=>{
 const d=detailFixture(),c=designFixture();d.bolts[0].threadsInShearPlane=false;
 c.loadCases[0].boltActions[0]={boltId:"B1",tensionKN:0,shearKN:0,pryingTensionKN:0};
 const b=capacity.calculate(d,c).boltChecks[0];
 const Ab=Math.PI*100;
 assert.ok(Math.abs(b.FnvMPa-440)<1e-10);
 assert.ok(Math.abs(b.shear.capacityKN-0.75*440*Ab/1000)<1e-10);
});
test("ordinary long-grip and axial end bolt reductions are applied only when triggered",()=>{
 const d=detailFixture(),c=designFixture();c.boltProperties[0].boltClass="ordinary";
 d.bolts[0].gripLengthMm=112;
 c.axialEndConnection=true;c.boltGroupAxialSpanMm=1000;
 c.loadCases[0].boltActions[0]={boltId:"B1",tensionKN:0,shearKN:0,pryingTensionKN:0};
 const b=capacity.calculate(d,c).boltChecks[0];
 assert.ok(Math.abs(b.gripReduction-(1-0.01*6)*(1-1/6))<1e-10);
});
test("bolt tension-shear interaction is activated above the 30 percent thresholds",()=>{
 const d=detailFixture(),c=designFixture();
 c.loadCases[0].boltActions[0]={boltId:"B1",tensionKN:100,shearKN:100,pryingTensionKN:0};
 const b=capacity.calculate(d,c).boltChecks[0];
 assert.equal(b.interactionApplied,true);
 assert.equal(b.status,"FAIL");
});
test("bearing and tearout checks distinguish the long-slot transverse direction",()=>{
 const d=detailFixture(),c=designFixture();
 d.bolts[0].holeType="long-slotted";d.bolts[0].slotLengthMm=40;d.bolts[0].slotWidthMm=22;d.bolts[0].slotAngleDeg=90;
 c.loadCases[0].bearingChecks[0].holeType="long-slotted";
 c.loadCases[0].bearingChecks[0].forceDirectionToSlot="transverse";
 const r=capacity.calculate(d,c).bearingChecks[0],plate=d.plates[0];
 const expectedBearing=0.75*2*20*16*plate.material.FuMPa/1000;
 const expectedTear=0.75*1*30*16*plate.material.FuMPa/1000;
 assert.ok(Math.abs(r.bearing.capacityKN-expectedBearing)<1e-10);
 assert.ok(Math.abs(r.tear.capacityKN-expectedTear)<1e-10);
});
test("plate section checks evaluate gross yielding, net rupture, shear yielding and shear rupture",()=>{
 const d=detailFixture(),c=designFixture(),r=capacity.calculate(d,c);
 const checks=r.plateChecks[0].checks;
 assert.deepEqual(checks.map(x=>x.limitState),["plate-tensile-yield","plate-tensile-rupture","plate-shear-yield","plate-shear-rupture"]);
 assert.ok(checks.every(x=>x.capacityKN>0));
});
test("block shear uses the explicit Ubs and path areas",()=>{
 const d=detailFixture(),c=designFixture(),r=capacity.calculate(d,c);
 const p=c.loadCases[0].blockShearChecks[0],m=d.plates[0].material;
 const expected=0.75*(Math.min(0.6*m.FyMPa*p.AgvMm2,0.6*m.FuMPa*p.AnvMm2)+p.Ubs*m.FuMPa*p.AntMm2)/1000;
 assert.ok(Math.abs(r.blockShearChecks[0].check.capacityKN-expected)<1e-10);
});
test("missing prying assessment or per-bolt demand distribution prevents calculation",()=>{
 const d=detailFixture(),c=designFixture();delete c.loadCases[0].pryingAssessment;
 assert.equal(capacity.validate(d,c).valid,false);
 const e=designFixture();e.boltDemandDistributionVerifiedByEngineer=false;
 assert.equal(capacity.validate(d,e).valid,false);
});
test("missing bolt action for even one bolt is rejected instead of assumed zero",()=>{
 const d=detailFixture(),c=designFixture();c.loadCases[0].boltActions=[];
 assert.equal(capacity.validate(d,c).valid,false);
});
test("slip-critical connection is not silently treated as bearing connection",()=>{
 const d=detailFixture(),c=designFixture();c.connectionType="slip-critical";
 assert.equal(capacity.validate(d,c).valid,false);
});
test("missing plate section or block shear geometry prevents a complete check",()=>{
 const d=detailFixture(),c=designFixture();c.loadCases[0].plateSectionChecks=[];
 assert.equal(capacity.validate(d,c).valid,false);
 const e=designFixture();e.loadCases[0].blockShearChecks[0].pathReference="";
 assert.equal(capacity.validate(d,e).valid,false);
});
test("ASD uses the specified safety factors and reports the method",()=>{
 const d=detailFixture(),c=designFixture();c.method="ASD";
 c.loadCases[0].boltActions[0]={boltId:"B1",tensionKN:0,shearKN:0,pryingTensionKN:0};
 const r=capacity.calculate(d,c);
 const Ab=Math.PI*100;
 assert.equal(r.method,"ASD");
 assert.ok(Math.abs(r.boltChecks[0].tension.capacityKN-(0.75*800*Ab/2/1000))<1e-10);
});

test("bearing connection rejects oversized holes and slots parallel to the force",()=>{
 const d=detailFixture(),c=designFixture();
 d.bolts[0].holeType="oversized";c.loadCases[0].bearingChecks[0].holeType="oversized";
 assert.equal(capacity.validate(d,c).valid,false);
 const e=detailFixture(),x=designFixture();
 e.bolts[0].holeType="short-slotted";e.bolts[0].slotLengthMm=40;e.bolts[0].slotWidthMm=22;e.bolts[0].slotAngleDeg=90;
 x.loadCases[0].bearingChecks[0].holeType="short-slotted";
 x.loadCases[0].bearingChecks[0].forceDirectionToSlot="parallel";
 assert.equal(capacity.validate(e,x).valid,false);
});

test("tension is reduced by shear even when tensile stress is below 30 percent",()=>{
 const d=detailFixture(),c=designFixture(),b=d.bolts[0];
 const Ab=Math.PI*b.diameterMm*b.diameterMm/4;
 const Fnv=0.45*b.FuMPa;
 const V=0.5*Fnv*Ab/1000;
 c.loadCases[0].boltActions[0]={boltId:"B1",tensionKN:0.1,shearKN:V,pryingTensionKN:0};
 const r=capacity.calculate(d,c).boltChecks[0];
 const expected=0.75*(0.75*b.FuMPa*(1.3-(V*1000/Ab)/(0.75*Fnv)))*Ab/1000;
 assert.ok(Math.abs(r.tension.capacityKN-expected)<1e-10);
 assert.equal(r.interactionApplied,true);
});
test("shear is reduced by tension even when shear stress is below 30 percent",()=>{
 const d=detailFixture(),c=designFixture(),b=d.bolts[0];
 const Ab=Math.PI*b.diameterMm*b.diameterMm/4;
 const T=0.5*0.75*b.FuMPa*Ab/1000;
 c.loadCases[0].boltActions[0]={boltId:"B1",tensionKN:T,shearKN:0.1,pryingTensionKN:0};
 const r=capacity.calculate(d,c).boltChecks[0];
 const expected=0.75*(0.45*b.FuMPa*(1.3-(T*1000/Ab)/(0.75*0.75*b.FuMPa)))*Ab/1000;
 assert.ok(Math.abs(r.shear.capacityKN-expected)<1e-10);
 assert.equal(r.interactionApplied,true);
});
