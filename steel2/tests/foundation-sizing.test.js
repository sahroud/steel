"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const soil=require("../js/foundation-soil-check.js");
const sizing=require("../js/foundation-sizing.js");
const base={
 soil:{soilType:"II",allowableBearingKPa:300,allowableBearingBasis:"gross",sourceReference:"Geotechnical report G-01 p.12"},
 footingLoads:{thicknessM:0.5,soilCoverAboveFootingM:0.5,concreteUnitWeightKNm3:24,soilUnitWeightKNm3:18},
 cases:[{name:"SLS-1",sourceReference:"Approved reactions R-1 p.4",NkN:900,MxkNm:10,MzkNm:10},
 {name:"SLS-2",sourceReference:"Approved reactions R-1 p.5",NkN:1100,MxkNm:15,MzkNm:12}]
};
function run(search,overrides={}){return sizing.searchFootingDimensions({...base,...overrides,search});}
test("selects the smallest feasible area and returns all separate SLS checks",()=>{
 const r=run({minB:1,maxB:3,stepB:0.5,minL:1,maxL:3,stepL:0.5,shape:"rectangular"});
 assert.equal(r.success,true);assert.ok(r.selected);
 assert.equal(r.selected.areaM2,3.75);
 assert.equal(r.selected.cases.length,2);
 assert.ok(r.selected.cases.every(x=>x.bearingPass));
});
test("returns explicit rejection details when no candidate passes",()=>{
 const r=run({minB:0.5,maxB:1,stepB:0.5,minL:0.5,maxL:1,stepL:0.5,shape:"rectangular"},
 {soil:{...base.soil,allowableBearingKPa:1}});
 assert.equal(r.success,false);assert.equal(r.selected,null);
 assert.ok(r.candidates.every(x=>x.status==="rejected"));
 assert.ok(r.candidates.some(x=>x.failedCases.some(c=>c.status==="fail-bearing-pressure")));
});
test("rejects search grids exceeding the configured candidate limit",()=>{
 assert.throws(()=>run({minB:1,maxB:5,stepB:0.1,minL:1,maxL:5,stepL:0.1,shape:"rectangular",maxCandidates:20}),/سقف/);
});
test("square mode evaluates only equal B and L dimensions",()=>{
 const r=run({minB:1,maxB:2,stepB:0.5,minL:1,maxL:2,stepL:0.5,shape:"square"});
 assert.ok(r.candidates.every(x=>x.B_m===x.L_m));
 assert.equal(r.counts.evaluated,3);
});
test("rectangular mode retains non-square candidates",()=>{
 const r=run({minB:1,maxB:2,stepB:0.5,minL:1,maxL:2,stepL:0.5,shape:"rectangular"});
 assert.ok(r.candidates.some(x=>x.B_m!==x.L_m));
 assert.equal(r.counts.evaluated,9);
});
test("every SLS combination is checked independently and a single failed case rejects the candidate",()=>{
 const r=run({minB:1,maxB:1,stepB:1,minL:1,maxL:1,stepL:1,shape:"rectangular"},
 {cases:[base.cases[0],{name:"SLS-3",sourceReference:"R-3 p.2",NkN:100,MxkNm:0,MzkNm:80}]});
 assert.equal(r.success,false);
 assert.equal(r.candidates[0].cases.length,2);
 assert.ok(r.candidates[0].failedCases.some(x=>x.name==="SLS-3"));
});
test("candidates with negative minimum gross pressure are rejected for no-tension contact",()=>{
 const r=run({minB:1,maxB:1,stepB:1,minL:1,maxL:1,stepL:1,shape:"rectangular"},
 {soil:{...base.soil,allowableBearingKPa:10000},
 cases:[{name:"SLS-eccentric",sourceReference:"R-4 p.2",NkN:100,MxkNm:0,MzkNm:80}]});
 assert.equal(r.success,false);
 assert.equal(r.candidates[0].failedCases[0].status,"blocked-no-tension-contact");
});
test("net and gross allowable bases are honored by the underlying footing check",()=>{
 const input={minB:2,maxB:2,stepB:1,minL:2,maxL:2,stepL:1,shape:"rectangular"};
 const gross=run(input),net=run(input,{soil:{...base.soil,allowableBearingBasis:"net",allowableBearingKPa:280}});
 assert.equal(gross.candidates[0].cases[0].qMaxCheckedKPa,gross.candidates[0].cases[0].qMaxGrossKPa);
 assert.equal(net.candidates[0].cases[0].qMaxCheckedKPa,net.candidates[0].cases[0].qMaxNetKPa);
});
test("invalid bounds and gaps are rejected",()=>{
 assert.throws(()=>run({minB:0,maxB:2,stepB:0.1,minL:1,maxL:2,stepL:0.1}),/معتبر نیستند/);
 assert.throws(()=>run({minB:1,maxB:2,stepB:-0.1,minL:1,maxL:2,stepL:0.1}),/معتبر نیستند/);
 assert.throws(()=>run({minB:2,maxB:1,stepB:0.1,minL:1,maxL:2,stepL:0.1}),/معتبر نیستند/);
});
test("candidate cap must be a safe positive integer",()=>{
 assert.throws(()=>run({minB:1,maxB:2,stepB:1,minL:1,maxL:2,stepL:1,maxCandidates:0}),/بین ۱ و ۱۰۰۰۰/);
 assert.throws(()=>run({minB:1,maxB:2,stepB:1,minL:1,maxL:2,stepL:1,maxCandidates:10001}),/بین ۱ و ۱۰۰۰۰/);
});
