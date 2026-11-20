"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const api=require("../js/member-demand-3d.js");
test("rejects booleans and whitespace in solver force, load, station, and axis inputs",()=>{
 const base={id:"M1",length:5,localEndForces:Array(12).fill(0),analysisLoad:{uniformLocal:[0,0,0]}};
 for(const bad of [true,false,"   "]){
  const force={...base,localEndForces:base.localEndForces.slice()};force.localEndForces[0]=bad;
  assert.throws(()=>api.recoverMember(force),/۱۲ مؤلفه‌ای/);
  const load={...base,analysisLoad:{uniformLocal:[bad,0,0]}};
  assert.throws(()=>api.recoverMember(load),/بار گسترده/);
  assert.throws(()=>api.sectionForcesAt(base,bad),/مختصات مقطع/);
  const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};axes.y[1]=bad;
  assert.throws(()=>api.recoverMember({...base,localAxes:axes}),/محورهای محلی/);
 }
});
test("rejects boolean and whitespace member lengths",()=>{
 for(const bad of [true,false,"   "])
  assert.throws(()=>api.recoverMember({id:"M",length:bad,localEndForces:Array(12).fill(0)}),/طول عضو/);
});
