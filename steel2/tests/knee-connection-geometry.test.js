"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const knee=require("../js/knee-connection-geometry.js");
function section(extra={}){
 return {profile:"Built-up I",geometryType:"built-up-I",sectionPropertyFingerprint:"fp-1",
  geometryDimensionsMm:{topFlangeWidthMm:220,topFlangeThicknessMm:12,bottomFlangeWidthMm:200,bottomFlangeThicknessMm:12,webClearHeightMm:500,webThicknessMm:8,...extra}};
}
function model(overrides={}){
 return {geometry:{span:12},nodes:[{id:"E",x:0,y:6,z:0,kind:"eave"},{id:"C",x:0,y:0,z:0},{id:"R",x:6,y:7.2,z:0}],
  members:[{id:"COL",start:"C",end:"E",sectionKey:"column",sectionProperties:section(),...overrides.column},
   {id:"RAF",start:"E",end:"R",sectionKey:"rafter",axis:"transverse",frame:1,sectionProperties:section({topFlangeWidthMm:180}),...overrides.rafter}]};
}
test("knee extraction reads actual assigned column and rafter geometry dimensions",()=>{
 const m=model({column:{sectionRollDeg:0,sectionOrientationVerified:true,sectionProperties:section({sectionRollDeg:0,sectionOrientationConfirmed:true})},rafter:{sectionRollDeg:0,sectionOrientationVerified:true,sectionProperties:section({topFlangeWidthMm:180,sectionRollDeg:0,sectionOrientationConfirmed:true})}});
 const k=knee.extract(m,analysisResult())[0];
 assert.equal(k.column.sectionGeometry.available,true);
 assert.equal(k.column.sectionGeometry.dimensionsMm.topFlangeWidthMm,220);
 assert.equal(k.rafter.sectionGeometry.dimensionsMm.topFlangeWidthMm,180);
 assert.equal(k.column.sectionSolids.available,true,JSON.stringify({axes:k.column.solverAxes,solids:k.column.sectionSolids}));
 assert.equal(k.column.sectionSolids.solids.length,3);
 assert.equal(k.webPlane.commonPlaneVerified,true);
 assert.equal(k.webPlane.columnWebFaceAtJoint.length,4);
 assert.equal(k.rafter.sectionSolids.solids.length,3);
 assert.equal(knee.check(k).valid,true);
});
test("missing section properties block knee geometry readiness",()=>{
 const m=model();delete m.members[0].sectionProperties;
 const k=knee.extract(m)[0];
 assert.equal(k.column.sectionGeometry.available,false);
 assert.equal(knee.check(k).valid,false);
});
test("unsupported profiles do not receive guessed built-up-I dimensions",()=>{
 const m=model();m.members[0].sectionProperties={...section(),geometryType:"catalog-profile"};
 const k=knee.extract(m)[0];
 assert.equal(k.column.sectionGeometry.status,"unsupported-or-unverified-profile");
 assert.equal(knee.check(k).valid,false);
});
test("invalid plate-girder dimensions are rejected",()=>{
 const s=knee.sectionGeometry({sectionProperties:section({webThicknessMm:700})});
 assert.equal(s.available,false);
 assert.match(s.issues.join(" "),/ارتفاع خالص جان|ضخامت جان/);
});
test("stale section fingerprints block geometry extraction",()=>{
 const m=model();m.members[0].sectionPropertyFingerprint="stale";
 const k=knee.extract(m)[0];
 assert.equal(k.column.sectionGeometry.status,"stale-section-fingerprint");
 assert.equal(knee.check(k).valid,false);
});
test("knee check never claims capacity design or execution readiness",()=>{
 const result=knee.check(knee.extract(model())[0]);
 assert.equal(result.capacityDesigned,false);
 assert.equal(result.executionReady,false);
 assert.equal(result.platePlaneVerified,false);
});
test("geometry sketch contains member axes only and no fabricated plate or bolt pattern",()=>{
 const drawing=knee.drawing(knee.extract(model())[0]);
 assert.equal(drawing.includes("<polygon"),false);
 assert.equal(drawing.includes("<circle"),false);
 assert.equal(drawing.includes("bolt"),false);
});
test("rolled built-up I member solids use the solver basis and centroidal asymmetric section geometry",()=>{
 const roll=90;
 const m=model({column:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({sectionRollDeg:roll,sectionOrientationConfirmed:true})},
  rafter:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({topFlangeWidthMm:180,sectionRollDeg:roll,sectionOrientationConfirmed:true})}});
 const result=analysisResult(roll);
 const k=knee.extract(m,result)[0];
 assert.equal(k.column.sectionSolids.available,true);
 assert.equal(k.column.sectionSolids.sectionRollDeg,90);
 assert.equal(k.column.sectionSolids.memberCenterlineAssumedCentroidal,true);
 assert.equal(k.column.sectionSolids.eccentricityIncluded,false);
 assert.equal(k.column.sectionSolids.solids.length,3);
 assert.equal(k.column.sectionSolids.solids[0].vertices.length,8);
 assert.equal(k.column.sectionSolids.solids[1].faces.length,6);
});
test("section solid extrusion blocks missing explicit roll and unconfirmed orientation",()=>{
 const noRoll=model();
 const k1=knee.extract(noRoll,analysisResult())[0];
 assert.equal(k1.column.sectionSolids.status,"section-roll-missing");
 const unconfirmed=model({column:{sectionRollDeg:0,sectionProperties:section({sectionRollDeg:0})}});
 const k2=knee.extract(unconfirmed,analysisResult())[0];
 assert.equal(k2.column.sectionSolids.status,"section-orientation-unconfirmed");
});
test("knee web plane is verified only when both rolled member webs lie in the frame plane",()=>{
 const make=roll=>model({column:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({sectionRollDeg:roll,sectionOrientationConfirmed:true})},
  rafter:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({topFlangeWidthMm:180,sectionRollDeg:roll,sectionOrientationConfirmed:true})}});
 const flat=knee.extract(make(0),analysisResult(0))[0];
 assert.equal(flat.webPlane.commonPlaneVerified,true);
 const rotated=knee.extract(make(90),analysisResult(90))[0];
 assert.equal(rotated.webPlane.commonPlaneVerified,false);
 assert.equal(rotated.webPlane.platePlaneVerified,false);
});
test("aggregate connection geometry reads axes from every combination case",()=>{
 const roll=0;
 const m=model({column:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({sectionRollDeg:roll,sectionOrientationConfirmed:true})},
  rafter:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({topFlangeWidthMm:180,sectionRollDeg:roll,sectionOrientationConfirmed:true})}});
 const axes=analysisResult(roll).members;
 const result={envelope:{cases:[{members:axes},{members:axes.map(item=>({...item}))}]}};
 const k=knee.extract(m,result)[0];
 assert.equal(k.column.solverAxes.available,true,JSON.stringify(k.column.solverAxes));
 assert.equal(k.column.sectionSolids.available,true);
});
test("aggregate connection geometry rejects axes missing from one load combination",()=>{
 const roll=0;
 const m=model({column:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({sectionRollDeg:roll,sectionOrientationConfirmed:true})}});
 const axes=analysisResult(roll).members;
 const result={envelope:{cases:[{members:axes},{members:axes.filter(item=>item.id!=="COL")}]}};
 const k=knee.extract(m,result)[0];
 assert.equal(k.column.solverAxes.status,"solver-axes-incomplete-combinations");
 assert.equal(k.column.sectionSolids.available,false);
});
test("member solid extrusion rejects a reference axis parallel to the member",()=>{
 const roll=0;
 const m=model({column:{referenceAxis:[0,1,0],sectionRollDeg:roll,sectionOrientationVerified:true,
  sectionProperties:section({sectionRollDeg:roll,sectionOrientationConfirmed:true,sectionReferenceAxis:[0,1,0]})}});
 const k=knee.extract(m,analysisResult(roll))[0];
 assert.equal(k.column.sectionSolids.status,"reference-axis-parallel-to-member");
});
test("section solid extrusion blocks mismatch between stored and analyzed roll",()=>{
 const roll=45;
 const m=model({column:{sectionRollDeg:roll,sectionOrientationVerified:true,sectionProperties:section({sectionRollDeg:roll,sectionOrientationConfirmed:true})}});
 const result=analysisResult(0);
 const k=knee.extract(m,result)[0];
 assert.equal(k.column.sectionSolids.status,"solver-roll-mismatch");
});

test("knee geometry self-test passes",()=>{
 const result=knee.selfTest();
 assert.equal(result.failed,0);
});

function analysisResult(roll=0){
 const rotate=(base)=>{const a=roll*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return{x:base.x,y:base.y.map((v,i)=>v*c+base.z[i]*s),z:base.z.map((v,i)=>base.z[i]*c-base.y[i]*s)};};
 const columnAxes=rotate({x:[0,1,0],y:[-1,0,0],z:[0,0,1]});
 const rafterAxes=rotate({x:[1/Math.sqrt(2.44),1.2/Math.sqrt(2.44),0],y:[-1.2/Math.sqrt(2.44),1/Math.sqrt(2.44),0],z:[0,0,1]});
 return {members:[{id:"COL",localAxes:columnAxes,sectionRollDeg:roll},{id:"RAF",localAxes:rafterAxes,sectionRollDeg:roll}]};
}
test("knee geometry consumes solver local axes by member id without inferring section roll",()=>{
 const m=model({column:{sectionRollDeg:0,sectionOrientationVerified:true,sectionProperties:section({sectionRollDeg:0,sectionOrientationConfirmed:true})},rafter:{sectionRollDeg:0,sectionOrientationVerified:true,sectionProperties:section({topFlangeWidthMm:180,sectionRollDeg:0,sectionOrientationConfirmed:true})}});
 const k=knee.extract(m,analysisResult())[0];
 assert.equal(k.column.solverAxes.available,true);
 assert.deepEqual(k.column.solverAxes.axes,{x:[0,1,0],y:[-1,0,0],z:[0,0,1]});
 assert.equal(k.rafter.solverAxes.source,"analysisResult.members.localAxes");
 assert.equal(knee.check(k).capacityDesigned,false);
});
test("missing solver result axes remain explicitly unavailable",()=>{
 const k=knee.extract(model())[0];
 assert.equal(k.column.solverAxes.available,false);
 assert.equal(k.column.solverAxes.status,"solver-axes-missing");
});
test("invalid solver axes are rejected rather than used for section geometry",()=>{
 const result={members:[{id:"COL",localAxes:{x:[1,0,0],y:[1,0,0],z:[0,0,1]}},{id:"RAF",localAxes:{x:[0,1,0],y:[0,0,1],z:[1,0,0]}}]};
 const k=knee.extract(model(),result)[0];
 assert.equal(k.column.solverAxes.available,false);
 assert.equal(k.column.solverAxes.status,"solver-axes-invalid");
 assert.equal(knee.check(k).capacityDesigned,false);
});
