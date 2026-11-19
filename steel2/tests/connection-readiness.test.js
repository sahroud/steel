"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
require("../js/connection-readiness.js");
const audit=globalThis.SahroudConnectionReadiness;
test("connection readiness blocks execution approval while connection designs are incomplete",()=>{
  const result=audit.assess();
  assert.equal(result.readyForExecution,false);
  assert.equal(result.status,"blocked-incomplete-connection-design");
  assert.equal(result.missing,result.total);
});
test("all critical connection families are explicitly audited",()=>{
  const ids=audit.assess().items.map(x=>x.id);
  for(const id of ["basePlate","knee","ridge","splice","braceGusset","purlinCleat","wallGirt","craneRail","endWall"]) assert.ok(ids.includes(id));
});
test("geometric knee and idealized purlin connection are not called designed",()=>{
  const items=audit.assess().items;
  assert.equal(items.find(x=>x.id==="knee").status,"geometry-only");
  assert.equal(items.find(x=>x.id==="purlinCleat").status,"analysis-idealization-only");
});
test("connection audit self-test passes",()=>{
  const result=audit.selfTest();
  assert.equal(result.failed,0);
});
