"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/analysis-3d.js");

const section = {E:200e9,G:77e9,A:0.01,Iy:8e-6,Iz:8e-6,J:1.6e-5};
const cantilever = {
  nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:4,y:0,z:0}],
  members:[{id:"AB",start:"A",end:"B",type:"beam",analysisLoad:{uniformLocal:[0,-1000,0]}}]
};
const supports=[{nodeId:"A",fixedDofs:[0,1,2,3,4,5]}];

test("3D cantilever reports balanced global forces and moments under uniform load",()=>{
  const result=globalThis.SteelFrame3D.analyze(cantilever,{
    supports,
    sectionResolver:()=>section
  });
  assert.equal(result.success,true);
  assert.equal(result.equilibrium.ok,true);
  assert.ok(result.equilibrium.relativeForceResidual<=1e-6);
  assert.ok(result.equilibrium.relativeMomentResidual<=1e-6);
  assert.ok(Math.abs(result.equilibrium.appliedForceN[1]+result.equilibrium.supportReactionN[1])<1e-6);
  assert.ok(Math.abs(result.equilibrium.appliedMomentNm[2]+result.equilibrium.supportMomentNm[2])<1e-6);
});

test("3D solver exposes applied load, support reaction and residual ledgers",()=>{
  const result=globalThis.SteelFrame3D.analyze(cantilever,{
    supports,
    sectionResolver:()=>section
  });
  for(const key of ["appliedForceN","supportReactionN","forceResidualN","appliedMomentNm","supportMomentNm","momentResidualNm"])
    assert.equal(Array.isArray(result.equilibrium[key]),true,key);
  assert.equal(result.equilibrium.forceResidualN.length,3);
  assert.equal(result.equilibrium.momentResidualNm.length,3);
});

test("3D solver preserves zero-valued support reaction records for every restrained node",()=>{
  const unloaded={
    nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:4,y:0,z:0}],
    members:[{id:"AB",start:"A",end:"B",type:"beam"}]
  };
  const result=globalThis.SteelFrame3D.analyze(unloaded,{
    supports:[
      {nodeId:"A",fixedDofs:[0,1,2,3,4,5]},
      {nodeId:"B",fixedDofs:[1]}
    ],
    sectionResolver:()=>section
  });
  assert.equal(result.success,true);
  assert.equal(result.supportReactionsAll.length,2);
  assert.deepEqual(result.supportReactionsAll.map(x=>x.nodeId),["A","B"]);
  assert.deepEqual(result.supportReactionsAll.map(x=>x.values),[
    [0,0,0,0,0,0],[0,0,0,0,0,0]
  ]);
  assert.equal(result.reactions.length,0,"legacy nonzero-only reactions remain available");
});

test("3D solver preserves every support reaction and balances a multi-support frame",()=>{
  const result=globalThis.SteelFrame3D.analyze(cantilever,{
    supports:[
      {nodeId:"A",fixedDofs:[0,1,2,3,4,5]},
      {nodeId:"B",fixedDofs:[0,1,2,3,4,5]}
    ],
    sectionResolver:()=>section
  });
  assert.equal(result.success,true);
  assert.equal(result.supportReactionsAll.length,2);
  assert.deepEqual(result.supportReactionsAll.map(x=>x.nodeId),["A","B"]);
  assert.ok(result.supportReactionsAll.every(x=>x.values.length===6&&x.values.every(Number.isFinite)));
  const vertical=result.supportReactionsAll.reduce((sum,x)=>sum+x.values[1],0);
  assert.ok(Math.abs(vertical-4000)<1e-6,"support vertical reactions must balance 4,000 N");
  assert.equal(result.equilibrium.ok,true);
  assert.ok(result.reactions.length>=1);
});
