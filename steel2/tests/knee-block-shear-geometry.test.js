"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),geo=require("../js/knee-block-shear-geometry.js");
function fixture(){const circle=(x,y,r)=>Array.from({length:32},(_,i)=>({x:x+r*Math.cos(2*Math.PI*i/32),y:y+r*Math.sin(2*Math.PI*i/32)}));return{plate:{id:"P1",thicknessMm:10,polygonMm:[{x:-100,y:-100},{x:200,y:-100},{x:200,y:100},{x:-100,y:100}]},forceDirectionLocal:{x:1,y:0},holes:[{id:"B1",xMm:20,yMm:-40,polygon:circle(20,-40,11)},{id:"B2",xMm:80,yMm:-40,polygon:circle(80,-40,11)},{id:"B3",xMm:20,yMm:40,polygon:circle(20,40,11)},{id:"B4",xMm:80,yMm:40,polygon:circle(80,40,11)}]};}
test("derives geometric candidate path from two transverse bolt rows without asserting capacity",()=>{const r=geo.assess(fixture());assert.equal(r.valid,true);assert.equal(r.candidates.length,4);const p=r.candidates.find(x=>x.terminalBoltIds[0]==="B2"&&x.terminalBoltIds[1]==="B4");assert.ok(p);assert.deepEqual(p.rowIds,[1,2]);assert.equal(p.status,"GEOMETRY_CANDIDATE_ONLY");assert.equal(p.capacityAssessable,false);assert.ok(p.geometricAreas.AgvMm2>p.geometricAreas.AnvMm2);assert.ok(p.geometricAreas.AntMm2>0);assert.deepEqual(p.crossedHoleIds,["B1","B2","B3","B4"]);});
test("rejects missing force direction, invalid thickness and incomplete hole geometry",()=>{let d=fixture();delete d.forceDirectionLocal;assert.equal(geo.assess(d).valid,false);d=fixture();d.plate.thicknessMm=0;assert.equal(geo.assess(d).valid,false);d=fixture();delete d.holes[0].polygon;assert.equal(geo.assess(d).valid,false);});
test("does not fabricate a candidate when the plate has no valid leading free edge",()=>{const d=fixture();d.plate.polygonMm=[{x:0,y:-50},{x:150,y:-50},{x:150,y:50},{x:0,y:50}];d.holes.forEach(h=>h.xMm=20);const r=geo.assess(d);assert.equal(r.candidates.length,4);assert.ok(r.candidates.every(c=>c.capacityAssessable===false));});

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
 const d=fixture();d.holes.push(...Array.from({length:20},(_,i)=>{const y=-90+i*9;return{id:"X"+i,xMm:20,yMm:y,polygon:Array.from({length:32},(_,k)=>({x:20+11*Math.cos(2*Math.PI*k/32),y:y+11*Math.sin(2*Math.PI*k/32)}))};}));
 const r=geo.assess(d);
 assert.ok(r.rejected.some(x=>x.truncated===true));
});
