"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),geo=require("../js/knee-block-shear-geometry.js");
function fixture(){const circle=(x,y,r)=>Array.from({length:32},(_,i)=>({x:x+r*Math.cos(2*Math.PI*i/32),y:y+r*Math.sin(2*Math.PI*i/32)}));return{plate:{id:"P1",thicknessMm:10,polygonMm:[{x:-100,y:-100},{x:200,y:-100},{x:200,y:100},{x:-100,y:100}]},forceDirectionLocal:{x:1,y:0},holes:[{id:"B1",xMm:20,yMm:-40,polygon:circle(20,-40,11)},{id:"B2",xMm:80,yMm:-40,polygon:circle(80,-40,11)},{id:"B3",xMm:20,yMm:40,polygon:circle(20,40,11)},{id:"B4",xMm:80,yMm:40,polygon:circle(80,40,11)}]};}
test("derives geometric candidate path from two transverse bolt rows without asserting capacity",()=>{const r=geo.assess(fixture());assert.equal(r.valid,true);assert.equal(r.candidates.length,4);const p=r.candidates.find(x=>x.terminalBoltIds[0]==="B2"&&x.terminalBoltIds[1]==="B4");assert.ok(p);assert.deepEqual(p.rowIds,[1,2]);assert.equal(p.status,"GEOMETRY_CANDIDATE_ONLY");assert.equal(p.capacityAssessable,false);assert.ok(p.geometricAreas.AgvMm2>p.geometricAreas.AnvMm2);assert.ok(p.geometricAreas.AntMm2>0);assert.deepEqual(p.crossedHoleIds,["B1","B2","B3","B4"]);});
test("rejects missing force direction, invalid thickness and incomplete hole geometry",()=>{let d=fixture();delete d.forceDirectionLocal;assert.equal(geo.assess(d).valid,false);d=fixture();d.plate.thicknessMm=0;assert.equal(geo.assess(d).valid,false);d=fixture();delete d.holes[0].polygon;assert.equal(geo.assess(d).valid,false);});
test("rejects paths whose selected terminal bolts lie beyond the plate free boundary",()=>{const d=fixture();d.plate.polygonMm=[{x:90,y:-50},{x:150,y:-50},{x:150,y:50},{x:90,y:50}];const r=geo.assess(d);assert.equal(r.valid,false);assert.equal(r.candidates.length,0);assert.ok(r.errors.length>0);});

test("rejects a candidate whose shear planes terminate on different segments of a notched free edge",()=>{
 const d=fixture();
 d.plate.polygonMm=[{x:-100,y:-100},{x:200,y:-100},{x:200,y:100},{x:-100,y:100},{x:-50,y:0}];
 const r=geo.assess(d);
 assert.equal(r.candidates.length,0);
 assert.ok(r.rejected.some(x=>x.reason.includes("لبه آزاد")));
});

test("enumerates staggered terminal bolt pairs as separate zigzag geometry candidates",()=>{
 const d=fixture();d.holes[2].xMm=40;d.holes[3].xMm=100;
 d.holes[2].polygon=Array.from({length:32},(_,i)=>({x:40+11*Math.cos(2*Math.PI*i/32),y:40+11*Math.sin(2*Math.PI*i/32)}));
 d.holes[3].polygon=Array.from({length:32},(_,i)=>({x:100+11*Math.cos(2*Math.PI*i/32),y:40+11*Math.sin(2*Math.PI*i/32)}));
 const r=geo.assess(d);
 assert.equal(r.valid,true);
 assert.ok(r.candidates.some(c=>c.pathType==="STAGGERED_ZIGZAG"&&c.terminalBoltIds[0]==="B2"&&c.terminalBoltIds[1]==="B4"));
 assert.ok(r.candidates.every(c=>c.status==="GEOMETRY_CANDIDATE_ONLY"&&c.capacityAssessable===false));
});
test("reports candidate enumeration truncation instead of silently dropping paths",()=>{
 const d=fixture(),circle=(x,y,r)=>Array.from({length:32},(_,k)=>({x:x+r*Math.cos(2*Math.PI*k/32),y:y+r*Math.sin(2*Math.PI*k/32)}));
 d.holes=[];
 for(let row=0;row<18;row++){const y=-85+row*10;d.holes.push({id:"L"+row,xMm:20,yMm:y,polygon:circle(20,y,4)},{id:"R"+row,xMm:80,yMm:y,polygon:circle(80,y,4)});}
 const r=geo.assess(d);
 assert.equal(r.valid,true);
 assert.ok(r.rejected.some(x=>x.truncated===true));assert.equal(r.candidateEnumerationComplete,false);assert.equal(r.candidateEnumerationStatus,"TRUNCATED_REVIEW_REQUIRED");
});

test("rejects hole polygons outside or crossing the plate boundary before path enumeration",()=>{
 const d=fixture();d.holes[0].polygon=d.holes[0].polygon.map(p=>({x:p.x-150,y:p.y}));
 const r=geo.assess(d);assert.equal(r.valid,false);assert.equal(r.status,"NOT_ASSESSABLE");
});
test("rejects overlapping bolt-hole polygons before candidate generation",()=>{
 const d=fixture();d.holes[1].xMm=20;d.holes[1].yMm=-40;d.holes[1].polygon=d.holes[0].polygon.map(p=>({x:p.x,y:p.y}));
 const r=geo.assess(d);assert.equal(r.valid,false);assert.match(r.errors.join(" "),/هم‌پوشانی/);
});

test("includes collinear overlap with a hole boundary in geometric net-length deduction",()=>{
 const square=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}];
 const spans=geo.linePolygonIntervals({x:-5,y:0},{x:15,y:0},square);
 assert.equal(spans.length,1);
 assert.ok(Math.abs(spans[0][0]-5)<1e-8);
 assert.ok(Math.abs(spans[0][1]-15)<1e-8);
 assert.equal(geo.subtractIntervals(20,spans),10);
});
test("merges overlapping hole deductions so a shared segment is not deducted twice",()=>{
 const net=geo.subtractIntervals(20,[[2,8],[5,12],[11,15]]);
 assert.equal(net,7);
});

test("rejects a self-intersecting bolt-hole boundary before computing net lengths",()=>{
 const d=fixture(),c=d.holes[0].polygon;
 d.holes[0].polygon=[c[0],c[8],c[16],c[24],c[1],c[9],c[17],c[25]];
 const r=geo.assess(d);assert.equal(r.valid,false);assert.equal(r.status,"NOT_ASSESSABLE");
});
test("rejects non-finite or zero-area plate boundaries",()=>{
 const d=fixture();d.plate.polygonMm[0].x=Number.NaN;
 assert.equal(geo.assess(d).valid,false);
 const q=fixture();q.plate.polygonMm=[{x:0,y:0},{x:10,y:0},{x:20,y:0}];
 assert.equal(geo.assess(q).valid,false);
});

test("rejects a bolt hole that only touches the plate boundary with zero edge clearance",()=>{
 const d=fixture();d.holes[0].xMm=-89;d.holes[0].polygon=d.holes[0].polygon.map(p=>({x:p.x-109,y:p.y+40}));
 const r=geo.assess(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("تماس دارد")));
});
test("rejects bolt-hole boundaries that touch without positive clear spacing",()=>{
 const d=fixture();d.holes[1].xMm=42;d.holes[1].polygon=d.holes[1].polygon.map(p=>({x:p.x-38,y:p.y+40}));
 const r=geo.assess(d);assert.equal(r.valid,false);assert.ok(r.errors.some(x=>x.includes("هم‌پوشانی")));
});
