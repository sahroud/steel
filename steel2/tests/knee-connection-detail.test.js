"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const detail=require("../js/knee-connection-detail.js");
function fixture(){
 return {schema:detail.SCHEMA,connectionId:"KNEE-01",jointId:"EAVE-1",drawingReference:"DWG-S-101-REV2",units:"mm",
  connectionFrame:{originM:[0,6,0],axes:{x:[1,0,0],y:[0,1,0],z:[0,0,1]},verifiedByDrawing:true},
  memberForceTransferPoints:[{role:"column",memberId:"COL-1",pointMm:[0,0,0]},{role:"rafter",memberId:"RAF-1",pointMm:[120,0,0]}],
  plates:[{id:"END-PLATE",thicknessMm:16,thicknessReference:"mid-plane",material:{grade:"ST37",FyMPa:235,FuMPa:360},
   frame:{originMm:[0,0,0],axes:{u:[1,0,0],v:[0,1,0],n:[0,0,1]}},
   polygonMm:[{x:-100,y:-100},{x:300,y:-100},{x:300,y:100},{x:-100,y:100}]}],
  bolts:[{id:"B1",plateId:"END-PLATE",xMm:0,yMm:-40,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,axisConnectionFrame:[0,0,1],gripLengthMm:36,axisVerifiedByDrawing:true,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1},
   {id:"B2",plateId:"END-PLATE",xMm:0,yMm:40,diameterMm:20,holeDiameterMm:22,grade:"8.8",FuMPa:800,axisConnectionFrame:[0,0,1],gripLengthMm:36,axisVerifiedByDrawing:true,holeType:"standard",threadsInShearPlane:true,shearPlaneCount:1}],
  welds:[{id:"W1",plateId:"END-PLATE",faceReference:"DWG-S-101-REV2/DETAIL-A",startMm:[-100,-60,0],endMm:[-100,60,0],type:"fillet",legSizeMm:8,electrodeFexxMPa:490}]};
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

test("force transfer points must identify one column and one rafter",()=>{
 const d=fixture();d.memberForceTransferPoints[1].role="column";
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("column و یک rafter")));
});
test("knee detail requires exactly two member transfer points",()=>{
 const d=fixture();d.memberForceTransferPoints.pop();
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("دقیقاً دو نقطه")));
});

test("each bolt must reference its actual host plate",()=>{
 const d=fixture();d.bolts[0].plateId="UNKNOWN";
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("ورق میزبان")));
});
test("slotted holes require explicit length width and direction",()=>{
 const d=fixture();d.bolts[0].holeType="long-slotted";
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("طول، عرض و زاویه شیار")));
 d.bolts[0].slotLengthMm=40;d.bolts[0].slotWidthMm=22;d.bolts[0].slotAngleDeg=90;
 assert.equal(detail.validate(d).valid,true);
});
test("fillet weld and groove weld use distinct size definitions",()=>{
 const d=fixture();d.welds[0].type="groove";d.welds[0].grooveType="CJP";d.welds[0].effectiveThroatMm=12;delete d.welds[0].legSizeMm;
 assert.equal(detail.validate(d).valid,true);
 d.welds[0].effectiveThroatMm=null;
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("گلویی مؤثر")));
});
test("welds must identify the connected plate and drawing face",()=>{
 const d=fixture();delete d.welds[0].faceReference;
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("وجه اتصال")));
});

test("each plate requires a verified orthonormal local 3D frame",()=>{
 const d=fixture();d.plates[0].frame.axes.n=[0,0,-1];
 const r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("محورهای محلی ورق")));
});
test("coincident bolt coordinates on different plates are not treated as duplicate holes",()=>{
 const d=fixture();d.plates.push({...d.plates[0],id:"BACK-PLATE"});
 d.bolts.push({...d.bolts[0],id:"B3",plateId:"BACK-PLATE"});
 assert.equal(detail.validate(d).valid,true);
});

test("weld endpoints must lie on and within the referenced plate",()=>{
 const d=fixture();d.welds[0].startMm=[-100,-60,5];
 let r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("روی صفحه ورق")));
 d.welds[0].startMm=[-120,-60,0];
 r=detail.validate(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("خارج از محدوده")));
});
test("weld geometry is checked against its own plate coordinate frame",()=>{
 const d=fixture();
 d.plates[0].frame.originMm=[-100,-100,0];
 d.plates[0].polygonMm=[{x:0,y:0},{x:400,y:0},{x:400,y:200},{x:0,y:200}];
 d.bolts[0].xMm=100;d.bolts[0].yMm=60;d.bolts[1].xMm=100;d.bolts[1].yMm=140;
 d.welds[0].startMm=[-100,-60,0];d.welds[0].endMm=[-100,60,0];
 const r=detail.validate(d);assert.equal(r.valid,true);
});

test("builds global 3D plate polygon, bolt and weld coordinates from declared frames",()=>{
 const d=fixture();const g=detail.buildGlobalGeometry(d);
 assert.equal(g.success,true);
 assert.deepEqual(g.plates[0].polygon[0].globalM,[-0.1,5.9,0]);
 assert.deepEqual(g.plates[0].bolts[0].centerGlobalM,[0,5.96,0]);
 assert.deepEqual(g.plates[0].bolts[0].axisGlobal,[0,0,1]);
 assert.equal(g.plates[0].bolts[0].shank.radiusMm,10);
 assert.deepEqual(g.plates[0].bolts[0].shank.startGlobalM,[0,5.96,-0.018]);
 assert.deepEqual(g.plates[0].bolts[0].shank.endGlobalM,[0,5.96,0.018]);
 assert.deepEqual(g.welds[0].startGlobalM,[-0.1,5.94,0]);
 assert.equal(g.capacityDesigned,false);
});
test("global geometry export rejects invalid connection details",()=>{
 const d=fixture();d.plates[0].frame.axes.n=[0,0,-1];
 assert.throws(()=>detail.buildGlobalGeometry(d),/هندسه اتصال معتبر نیست/);
});

test("plate solid faces are extruded symmetrically about the explicitly declared mid-plane",()=>{
 const d=fixture();const g=detail.buildGlobalGeometry(d);const solid=g.plates[0].solid;
 assert.deepEqual(solid.minusFaceGlobalM[0],[-0.1,5.9,-0.008]);
 assert.deepEqual(solid.plusFaceGlobalM[0],[-0.1,5.9,0.008]);
 assert.equal(solid.sideFaces.length,4);
 assert.equal(g.plates[0].thicknessReference,"mid-plane");
});
test("plate solid generation rejects an unspecified thickness reference plane",()=>{
 const d=fixture();delete d.plates[0].thicknessReference;
 const r=detail.validate(d);assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("مرجع ضخامت")));
});

test("plate solid exports correctly oriented triangulated top and bottom meshes",()=>{
 const d=fixture();const g=detail.buildGlobalGeometry(d);const mesh=g.plates[0].solid.triangulation;
 assert.equal(mesh.method,"ear-clipping");
 assert.equal(mesh.top.length,2);
 assert.equal(mesh.bottom.length,2);
 const same=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-10);
 for(const tri of mesh.top)for(const vertex of tri)
  assert.ok(g.plates[0].solid.plusFaceGlobalM.some(point=>same(point,vertex)));
 for(const tri of mesh.bottom)for(const vertex of tri)
  assert.ok(g.plates[0].solid.minusFaceGlobalM.some(point=>same(point,vertex)));
});
test("concave plate polygon is triangulated without assuming a rectangular plate",()=>{
 const d=fixture();
 d.plates[0].polygonMm=[{x:-100,y:-100},{x:300,y:-100},{x:100,y:0},{x:300,y:100},{x:-100,y:100}];
 d.bolts[0].xMm=0;d.bolts[0].yMm=-40;d.bolts[1].xMm=0;d.bolts[1].yMm=40;
 const g=detail.buildGlobalGeometry(d);
 assert.equal(g.plates[0].solid.triangulation.top.length,3);
});

test("plate polygons with repeated vertices are rejected before solid generation",()=>{
 const d=fixture();
 d.plates[0].polygonMm=[{x:-100,y:-100},{x:300,y:-100},{x:300,y:100},{x:300,y:100},{x:-100,y:100}];
 const r=detail.validate(d);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("رأس")&&x.includes("تکراری")));
 assert.throws(()=>detail.buildGlobalGeometry(d),/هندسه اتصال معتبر نیست/);
});
test("plate polygons with consecutive collinear vertices are rejected before ear clipping",()=>{
 const d=fixture();
 d.plates[0].polygonMm=[{x:-100,y:-100},{x:100,y:-100},{x:300,y:-100},{x:300,y:100},{x:-100,y:100}];
 const r=detail.validate(d);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("هم‌خط")));
});
test("clockwise concave plate polygons retain a valid triangulated solid",()=>{
 const d=fixture();
 d.plates[0].polygonMm=[{x:-100,y:100},{x:300,y:100},{x:100,y:0},{x:300,y:-100},{x:-100,y:-100}];
 d.bolts[0].xMm=0;d.bolts[0].yMm=40;d.bolts[1].xMm=0;d.bolts[1].yMm=-40;
 const g=detail.buildGlobalGeometry(d);
 assert.equal(g.plates[0].solid.triangulation.top.length,3);
 assert.equal(g.plates[0].solid.triangulation.bottom.length,3);
});

test("bolt axis, grip length and drawing verification are mandatory",()=>{
 const d=fixture();delete d.bolts[0].axisConnectionFrame;
 assert.equal(detail.validate(d).valid,false);
 const e=fixture();e.bolts[0].axisConnectionFrame=[0,0,2];
 assert.equal(detail.validate(e).valid,false);
 const f=fixture();f.bolts[0].gripLengthMm=0;
 assert.equal(detail.validate(f).valid,false);
 const g=fixture();g.bolts[0].axisVerifiedByDrawing=false;
 assert.equal(detail.validate(g).valid,false);
});

test("builds only drawing-defined bolt head nut and washer geometry",()=>{
 const d=fixture();
 d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[
  {id:"H1",kind:"head",centerOffsetMm:-24,thicknessMm:12,acrossFlatsMm:30},
  {id:"N1",kind:"nut",centerOffsetMm:24,thicknessMm:16,acrossFlatsMm:30},
  {id:"W1",kind:"washer",centerOffsetMm:14.5,thicknessMm:3,outerDiameterMm:36,innerDiameterMm:22}
 ];
 const g=detail.buildGlobalGeometry(d),hw=g.plates[0].bolts[0].hardware;
 assert.equal(hw.length,3);
 assert.equal(hw[0].geometry.method,"regular-hex-prism");
 assert.equal(hw[1].geometry.topFaceGlobalM.length,6);
 assert.equal(hw[2].geometry.method,"32-segment-annulus");
 assert.equal(hw[2].geometry.innerTopFaceGlobalM.length,32);
});
test("rejects bolt hardware without an explicit transverse drawing reference",()=>{
 const d=fixture();d.bolts[0].hardware=[{id:"H1",kind:"head",centerOffsetMm:-24,thicknessMm:12,acrossFlatsMm:30}];
 assert.equal(detail.validate(d).valid,false);
});

test("rejects invalid washer dimensions and non-perpendicular hardware reference",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[{id:"W1",kind:"washer",centerOffsetMm:15,thicknessMm:3,outerDiameterMm:20,innerDiameterMm:22}];
 assert.equal(detail.validate(d).valid,false);
 const e=fixture();e.bolts[0].transverseReferenceConnectionFrame=[0,0,1];
 e.bolts[0].hardware=[{id:"H1",kind:"head",centerOffsetMm:-24,thicknessMm:12,acrossFlatsMm:30}];
 assert.equal(detail.validate(e).valid,false);
});

test("full circular hole boundary must remain inside the host plate",()=>{
 const d=fixture();d.bolts[0].xMm=290;
 const r=detail.validate(d);assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("تمام محیط سوراخ")));
});
test("slotted hole ends must remain inside the host plate even when its centre is inside",()=>{
 const d=fixture();d.bolts[0].xMm=285;d.bolts[0].holeType="long-slotted";
 d.bolts[0].slotLengthMm=40;d.bolts[0].slotWidthMm=22;d.bolts[0].slotAngleDeg=0;
 const r=detail.validate(d);assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("تمام محیط سوراخ")));
});
test("overlapping holes on the same plate are rejected by their full boundaries",()=>{
 const d=fixture();d.bolts[1].yMm=-20;
 const r=detail.validate(d);assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("تداخل دارد")));
});
test("global geometry exports drawing-oriented circular and slotted hole boundaries",()=>{
 const d=fixture();d.bolts[1].holeType="short-slotted";
 d.bolts[1].slotLengthMm=40;d.bolts[1].slotWidthMm=22;d.bolts[1].slotAngleDeg=90;
 const g=detail.buildGlobalGeometry(d),holes=g.plates[0].bolts;
 assert.equal(holes[0].holeGeometry.method,"32-segment-circle-approximation");
 assert.equal(holes[0].holeGeometry.verticesLocalMm.length,32);
 assert.equal(holes[1].holeGeometry.method,"capsule-polygon-approximation");
 assert.equal(holes[1].holeGeometry.verticesLocalMm.length,34);
 assert.ok(holes[1].holeGeometry.verticesGlobalM.every(p=>p.length===3&&p.every(Number.isFinite)));
});

test("hole-layout audit groups bolts into rows along an explicit force direction",()=>{
 const d=fixture();d.bolts[1].xMm=80;d.bolts[1].yMm=-40;
 const a=detail.analyzeHoleLayout(d,"END-PLATE",{forceDirectionLocal:{x:1,y:0},rowToleranceMm:1});
 assert.equal(a.status,"GEOMETRY_AUDIT_ONLY");
 assert.equal(a.blockShearPathsDerived,false);
 assert.equal(a.rows.length,1);
 assert.deepEqual(a.rows[0].holes.map(h=>h.id),["B1","B2"]);
 assert.ok(Math.abs(a.holeClearances[0].clearDistanceMm-58)<1e-6);
 assert.ok(a.holes.every(h=>h.edgeClearanceMm>0));
});
test("hole-layout audit keeps separate transverse rows and requires explicit force direction",()=>{
 const d=fixture();
 const a=detail.analyzeHoleLayout(d,"END-PLATE",{forceDirectionLocal:{x:1,y:0}});
 assert.equal(a.rows.length,2);
 assert.throws(()=>detail.analyzeHoleLayout(d,"END-PLATE",{}),/راستای نیرو/);
});

test("hole polygon builder rejects unknown hole types instead of silently treating them as circular",()=>{
 const d=fixture(),bolt=d.bolts[0];
 for(const holeType of ["standard","oversized"]){
  const points=detail.buildHolePolygon({...bolt,holeType});
  assert.equal(points.length,32);
 }
 for(const holeType of ["short-slotted","long-slotted"]){
  const points=detail.buildHolePolygon({...bolt,holeType,slotLengthMm:40,slotWidthMm:22,slotAngleDeg:0});
  assert.equal(points.length,34);
 }
 assert.throws(()=>detail.buildHolePolygon({...bolt,holeType:"unrecognized"}),/نوع سوراخ/);
 assert.throws(()=>detail.buildHolePolygon({...bolt,holeType:undefined}),/نوع سوراخ/);
});

test("weld endpoints inside a concave plate do not permit a weld path through the notch",()=>{
 const d=fixture();
 d.plates[0].polygonMm=[
  {x:0,y:0},{x:100,y:0},{x:100,y:100},{x:60,y:100},
  {x:60,y:40},{x:40,y:40},{x:40,y:100},{x:0,y:100}
 ];
 d.bolts[0].xMm=20;d.bolts[0].yMm=80;
 d.bolts[1].xMm=80;d.bolts[1].yMm=80;
 d.welds[0].startMm=[20,80,0];
 d.welds[0].endMm=[80,80,0];
 const r=detail.validate(d);
 assert.equal(detail.pointInPolygon({x:20,y:80},d.plates[0].polygonMm),true);
 assert.equal(detail.pointInPolygon({x:80,y:80},d.plates[0].polygonMm),true);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("مسیر کامل خط جوش")));
});
test("weld path wholly inside a concave plate remains geometrically valid",()=>{
 const d=fixture();
 d.plates[0].polygonMm=[
  {x:0,y:0},{x:100,y:0},{x:100,y:100},{x:60,y:100},
  {x:60,y:40},{x:40,y:40},{x:40,y:100},{x:0,y:100}
 ];
 d.bolts[0].xMm=20;d.bolts[0].yMm=80;
 d.bolts[1].xMm=20;d.bolts[1].yMm=20;
 d.welds[0].startMm=[10,80,0];
 d.welds[0].endMm=[30,80,0];
 assert.equal(detail.validate(d).valid,true);
});

test("bolt hardware with positive coaxial axial overlap is rejected and audited",()=>{
 const d=fixture();
 d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[
  {id:"HEAD",kind:"head",centerOffsetMm:-20,thicknessMm:12,acrossFlatsMm:30},
  {id:"WASHER",kind:"washer",centerOffsetMm:-13,thicknessMm:4,outerDiameterMm:36,innerDiameterMm:22}
 ];
 const r=detail.validate(d);
 assert.equal(r.valid,false);
 assert.ok(r.errors.some(x=>x.includes("تداخل محوری")&&x.includes("HEAD")&&x.includes("WASHER")));
 const audit=detail.auditHardwareAxialIntervals(d.bolts[0].hardware);
 assert.equal(audit.status,"INTERFERENCE_DETECTED");
 assert.equal(audit.pairs[0].status,"AXIAL_INTERFERENCE");
 assert.equal(audit.pairs[0].overlapMm,1);
});
test("bolt hardware face contact and positive axial clearance are not false collisions",()=>{
 const touching=[
  {id:"HEAD",centerOffsetMm:-10,thicknessMm:8},
  {id:"WASHER",centerOffsetMm:-4,thicknessMm:4},
  {id:"NUT",centerOffsetMm:5,thicknessMm:10}
 ];
 const audit=detail.auditHardwareAxialIntervals(touching);
 assert.equal(audit.status,"NO_AXIAL_INTERFERENCE_DETECTED");
 assert.deepEqual(audit.pairs.map(p=>p.status),["FACE_CONTACT","AXIAL_CLEARANCE","AXIAL_CLEARANCE"]);
 assert.equal(audit.pairs[0].overlapMm,0);
});
test("hardware axial audit reports malformed intervals as not assessable",()=>{
 const audit=detail.auditHardwareAxialIntervals([
  {id:"A",centerOffsetMm:0,thicknessMm:4},
  {id:"B",centerOffsetMm:1,thicknessMm:0}
 ]);
 assert.equal(audit.status,"NOT_ASSESSABLE");
 assert.equal(audit.pairs[0].status,"NOT_ASSESSABLE");
});

test("parallel plate prisms with overlapping footprints and thickness are detected",()=>{
 const d=fixture(),b={...d.plates[0],id:"BACK-PLATE",frame:{...d.plates[0].frame,originMm:[0,0,10]}};
 d.plates.push(b);
 const audit=detail.auditPlateInteractions(d.plates);
 assert.equal(audit.status,"INTERFERENCE_DETECTED");
 assert.equal(audit.pairs[0].status,"VOLUME_INTERFERENCE");
 assert.equal(audit.pairs[0].thicknessOverlapMm,6);
 assert.ok(audit.pairs[0].projectedOverlapAreaMm2>0);
});
test("parallel plate face contact is distinguished from volume interference",()=>{
 const d=fixture(),b={...d.plates[0],id:"BACK-PLATE",frame:{...d.plates[0].frame,originMm:[0,0,16]}};
 d.plates.push(b);
 const pair=detail.auditPlateInteractions(d.plates).pairs[0];
 assert.equal(pair.status,"FACE_CONTACT");
 assert.equal(pair.thicknessOverlapMm,0);
});
test("parallel plates with separated thickness intervals are clear",()=>{
 const d=fixture(),b={...d.plates[0],id:"BACK-PLATE",frame:{...d.plates[0].frame,originMm:[0,0,20]}};
 d.plates.push(b);
 const pair=detail.auditPlateInteractions(d.plates).pairs[0];
 assert.equal(pair.status,"THICKNESS_CLEARANCE");
 assert.equal(pair.thicknessOverlapMm,-4);
});
test("parallel plates with disjoint projected polygons do not collide",()=>{
 const d=fixture(),b={...d.plates[0],id:"REMOTE-PLATE",frame:{...d.plates[0].frame,originMm:[500,0,0]}};
 d.plates.push(b);
 assert.equal(detail.auditPlateInteractions(d.plates).pairs[0].status,"NO_PROJECTED_OVERLAP");
});
test("anti-parallel plate frames are assessed consistently",()=>{
 const d=fixture(),b={...d.plates[0],id:"REVERSED-PLATE",frame:{originMm:[0,0,10],axes:{u:[1,0,0],v:[0,-1,0],n:[0,0,-1]}}};
 d.plates.push(b);
 assert.equal(detail.auditPlateInteractions(d.plates).pairs[0].status,"VOLUME_INTERFERENCE");
});
test("non-parallel plate pairs are explicitly not assessable",()=>{
 const d=fixture(),b={...d.plates[0],id:"CROSS-PLATE",frame:{originMm:[0,0,0],axes:{u:[0,0,-1],v:[0,1,0],n:[1,0,0]}}};
 d.plates.push(b);
 const pair=detail.auditPlateInteractions(d.plates).pairs[0];
 assert.equal(pair.status,"NOT_ASSESSABLE");
 assert.ok(pair.reason.includes("غیرموازی"));
});
test("global geometry exposes plate interaction audit and limitations",()=>{
 const d=fixture();d.plates.push({...d.plates[0],id:"BACK-PLATE",frame:{...d.plates[0].frame,originMm:[0,0,10]}});
 const result=detail.buildGlobalGeometry(d);
 assert.equal(result.plateInteractionAudit.pairs[0].status,"VOLUME_INTERFERENCE");
 assert.ok(result.plateInteractionAudit.limitations.length>=3);
});
test("hardware-to-host-plate audit distinguishes washer face contact from penetration",()=>{
 const d=fixture();d.bolts[0].hardware=[{id:"W1",kind:"washer",centerOffsetMm:9.5,thicknessMm:3,outerDiameterMm:36,innerDiameterMm:20}];
 const contact=detail.auditHardwarePlateInteractions(d);assert.equal(contact.pairs[0].status,"FACE_CONTACT");
 d.bolts[0].hardware[0].centerOffsetMm=8;
 const penetration=detail.auditHardwarePlateInteractions(d);assert.equal(penetration.pairs[0].status,"VOLUME_INTERFERENCE");
});
test("hardware-to-host-plate audit classifies hex head contact and radial clearance",()=>{
 const d=fixture();d.bolts[0].hardware=[{id:"H1",kind:"head",centerOffsetMm:-14,thicknessMm:12,acrossFlatsMm:30}];
 assert.equal(detail.auditHardwarePlateInteractions(d).pairs[0].status,"FACE_CONTACT");
 d.bolts[0].hardware[0].acrossFlatsMm=18;
 assert.equal(detail.auditHardwarePlateInteractions(d).pairs[0].status,"NO_SOLID_OVERLAP");
});
test("hardware-to-plate audit refuses tilted axes and ambiguous hex-to-hole geometry",()=>{
 const d=fixture();d.bolts[0].hardware=[{id:"H1",kind:"head",centerOffsetMm:0,thicknessMm:12,acrossFlatsMm:20}];
 assert.equal(detail.auditHardwarePlateInteractions(d).pairs[0].status,"NOT_ASSESSABLE");
 d.bolts[0].axisConnectionFrame=[1,0,0];
 assert.equal(detail.auditHardwarePlateInteractions(d).pairs[0].status,"NOT_ASSESSABLE");
});
test("weld-to-plate solid interaction remains explicitly not assessable without weld volume",()=>{
 const report=detail.auditWeldPlateInteractions(fixture());
 assert.equal(report.status,"NOT_ASSESSABLE");assert.equal(report.pairs[0].status,"NOT_ASSESSABLE");
});
test("global geometry includes separate hardware and weld interaction audit reports",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[{id:"W1",kind:"washer",centerOffsetMm:9.5,thicknessMm:3,outerDiameterMm:36,innerDiameterMm:20}];
 const g=detail.buildGlobalGeometry(d);
 assert.equal(g.hardwarePlateInteractionAudit.pairs[0].status,"FACE_CONTACT");
 assert.equal(g.weldPlateInteractionAudit.pairs[0].status,"NOT_ASSESSABLE");
});
test("hardware is checked against a parallel non-host plate and detects volumetric penetration",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];d.plates.push({...d.plates[0],id:"BACK-PLATE",frame:{...d.plates[0].frame,originMm:[0,0,20]}});
 d.bolts[0].hardware=[{id:"W-OTHER",kind:"washer",centerOffsetMm:15,thicknessMm:4,outerDiameterMm:36,innerDiameterMm:22}];
 const report=detail.auditHardwareOtherPlateInteractions(d);
 assert.equal(report.pairs[0].status,"VOLUME_INTERFERENCE");
 assert.ok(report.pairs[0].projectedMaterialOverlapAreaMm2>0);
});
test("hardware-to-nonhost-plate audit subtracts the target plate's bolt hole",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];d.plates.push({...d.plates[0],id:"BACK-PLATE",frame:{...d.plates[0].frame,originMm:[0,0,20]}});
 d.bolts[0].holeDiameterMm=40;d.bolts.push({...d.bolts[0],id:"B3",plateId:"BACK-PLATE",xMm:0,yMm:-40});
 d.bolts[0].hardware=[{id:"W-HOLE",kind:"washer",centerOffsetMm:15,thicknessMm:4,outerDiameterMm:36,innerDiameterMm:22}];
 const report=detail.auditHardwareOtherPlateInteractions(d);
 assert.equal(report.pairs[0].status,"NO_PROJECTED_OVERLAP");
});
test("hardware-to-nonhost-plate audit keeps nonparallel geometry not assessable",()=>{
 const d=fixture();d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];d.plates.push({...d.plates[0],id:"SIDE-PLATE",frame:{originMm:[0,0,0],axes:{u:[0,0,-1],v:[0,1,0],n:[1,0,0]}}});
 d.bolts[0].hardware=[{id:"H-SIDE",kind:"head",centerOffsetMm:0,thicknessMm:12,acrossFlatsMm:30}];
 assert.equal(detail.auditHardwareOtherPlateInteractions(d).pairs[0].status,"NOT_ASSESSABLE");
});
test("global geometry exposes non-host hardware interaction audit",()=>{
 const d=fixture();d.plates.push({...d.plates[0],id:"BACK-PLATE",frame:{...d.plates[0].frame,originMm:[0,0,20]}});
 d.bolts[0].transverseReferenceConnectionFrame=[1,0,0];
 d.bolts[0].hardware=[{id:"W-OTHER",kind:"washer",centerOffsetMm:15,thicknessMm:4,outerDiameterMm:36,innerDiameterMm:22}];
 const g=detail.buildGlobalGeometry(d);
 assert.equal(g.hardwareOtherPlateInteractionAudit.pairs[0].status,"VOLUME_INTERFERENCE");
});
test("fillet weld solid is built from explicit orthogonal leg directions and contacts host face",()=>{
 const d=fixture();d.welds[0].startMm=[-80,-60,0];d.welds[0].endMm=[-80,60,0];Object.assign(d.welds[0],{plateFaceSide:1,plateLegDirectionConnection:[0,1,0],connectedLegDirectionConnection:[0,0,1]});
 const r=detail.auditWeldPlateInteractions(d);assert.equal(r.pairs[0].status,"GEOMETRY_BUILT_HOST_FACE_CONTACT_ONLY");
 assert.equal(r.solids[0].geometryType,"triangular-fillet-prism");assert.equal(r.solids[0].volumeMm3,3840);
 assert.equal(r.solids[0].hostPlateContact.status,"ROOT_FACE_CONTACT_ONLY");
});
test("fillet weld solid builder refuses an inward connected leg or nonorthogonal section",()=>{
 const d=fixture();Object.assign(d.welds[0],{plateFaceSide:1,plateLegDirectionConnection:[0,1,0],connectedLegDirectionConnection:[0,0,-1]});
 assert.equal(detail.auditWeldPlateInteractions(d).pairs[0].status,"NOT_ASSESSABLE");
 d.welds[0].connectedLegDirectionConnection=[0,1,0];
 assert.equal(detail.auditWeldPlateInteractions(d).pairs[0].status,"NOT_ASSESSABLE");
});
test("groove weld solid remains not assessable without explicit groove preparation geometry",()=>{
 const d=fixture();d.welds[0].type="groove";d.welds[0].grooveType="CJP";d.welds[0].effectiveThroatMm=12;
 assert.equal(detail.auditWeldPlateInteractions(d).pairs[0].status,"NOT_ASSESSABLE");
});
test("global weld geometry carries generated fillet prism or explicit null",()=>{
 const d=fixture();d.welds[0].startMm=[-80,-60,0];d.welds[0].endMm=[-80,60,0];Object.assign(d.welds[0],{plateFaceSide:1,plateLegDirectionConnection:[0,1,0],connectedLegDirectionConnection:[0,0,1]});
 const g=detail.buildGlobalGeometry(d);assert.ok(g.welds[0].solidGeometry);assert.equal(g.welds[0].solidGeometry.verticesGlobalM.length,6);
});
