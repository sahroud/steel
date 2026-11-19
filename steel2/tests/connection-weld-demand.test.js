"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {analyze}=require("../js/connection-weld-demand.js");
test("zero load gives zero weld-group line demand",()=>{
 const r=analyze({width:200,height:300,N:0,V:0,M:0});
 assert.equal(r.maxLineDemand,0);assert.equal(r.perimeter,1000);
});
test("signed concurrent actions are retained and reverse consistently",()=>{
 const a=analyze({width:200,height:300,N:20,V:30,M:4000});
 const b=analyze({width:200,height:300,N:-20,V:-30,M:-4000});
 assert.deepEqual(a.components,{N:20,V:30,M:4000});
 assert.ok(Math.abs(a.maxLineDemand-b.maxLineDemand)<1e-12);
 assert.ok(a.samples.some(p=>p.qx!==0&&p.qy!==0));
});
test("pure axial and pure shear demands are uniform",()=>{
 const n=analyze({width:200,height:300,N:40,V:0,M:0});
 const v=analyze({width:200,height:300,N:0,V:40,M:0});
 assert.ok(n.samples.every(p=>Math.abs(p.qx-.04)<1e-12&&p.qy===0));
 assert.ok(v.samples.every(p=>Math.abs(p.qy-.04)<1e-12&&p.qx===0));
});
test("invalid dimensions and non-finite forces are rejected",()=>{
 assert.throws(()=>analyze({width:0,height:300,N:0,V:0,M:0}));
 assert.throws(()=>analyze({width:200,height:300,N:NaN,V:0,M:0}));
});
