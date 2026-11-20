"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
require("../js/member-end-connection-ui.js");
const api=global.SahroudMemberEndConnectionUI;
function model(){return {members:[
 {id:"W1",sectionKey:"wallBrace",physicalConnectionStatus:"unverified",analysisJointAssumption:"shared-node-rotational-continuity"},
 {id:"R1",sectionKey:"roofBrace",physicalConnectionStatus:"unverified",analysisJointAssumption:"shared-node-rotational-continuity"},
 {id:"C1",sectionKey:"column"}
]};}
test("generated braces keep the existing continuous rotational assumption unless explicitly changed",()=>{
 const m=model();api.setData([]);api.setModel(m);
 assert.equal(Object.hasOwn(m.members[0],"endReleases"),false);
 assert.equal(m.members[0].analysisJointAssumption,"shared-node-rotational-continuity");
 assert.equal(m.members[0].physicalConnectionStatus,"unverified");
});
test("user can release I and J brace ends independently with all three local rotations",()=>{
 const m=model();api.setData([{memberId:"W1",i:"pinned",j:"continuous"},{memberId:"R1",i:"continuous",j:"pinned"}]);api.setModel(m);
 assert.deepEqual(m.members[0].endReleases,{i:["rx","ry","rz"]});
 assert.deepEqual(m.members[1].endReleases,{j:["rx","ry","rz"]});
 assert.equal(m.members[0].analysisJointAssumption,"user-selected-released-rotations");
 assert.equal(m.members[0].physicalConnectionStatus,"unverified");
 assert.equal(Object.hasOwn(m.members[2],"endReleases"),false);
});
test("continuous choice removes release data and restores the original analytical assumption",()=>{
 const m=model();api.setData([{memberId:"W1",i:"pinned",j:"pinned"}]);api.setModel(m);
 api.setData([{memberId:"W1",i:"continuous",j:"continuous"}]);api.setModel(m);
 assert.equal(Object.hasOwn(m.members[0],"endReleases"),false);
 assert.equal(m.members[0].analysisJointAssumption,"shared-node-rotational-continuity");
});
test("member end connection settings round-trip and reject invalid or duplicate records",()=>{
 const data=[{memberId:"W1",i:"pinned",j:"continuous"}];api.setData(data);
 assert.deepEqual(api.getData(),data);
 assert.throws(()=>api.setData([{memberId:"W1",i:"unknown",j:"continuous"}]),/معتبر نیست/);
 assert.throws(()=>api.setData([{memberId:"W1"},{memberId:"W1"}]),/تکراری/);
 assert.throws(()=>api.normalizeRecord({memberId:"W1",i:"pinned",j:"hinge"}),/معتبر نیست/);
 api.setData([]);
});
test("stale member IDs are reported rather than applied to a different brace",()=>{
 api.setData([{memberId:"OLD-WALL",i:"pinned",j:"continuous"}]);
 const current=model();
 const report=api.applyToModel(current);
 assert.deepEqual(report.orphanedMemberIds,["OLD-WALL"]);
 assert.equal(Object.hasOwn(current.members[0],"endReleases"),false);
 api.setData([]);
});
