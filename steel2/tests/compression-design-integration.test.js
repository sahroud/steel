"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.document = {
  readyState: "loading",
  addEventListener() {},
  getElementById() { return null; }
};
const api = require("../js/compression-design-integration.js");
const model = {members:[{id:"M1",sectionKey:"column",length:6}]};
const vector = [120000,0,0,0,0,0,-120000,0,0,0,0,0];
const combination = (id) => ({id,label:id,members:[{id:"M1",length:6,localEndForces:vector}]});

test("3D compression demand requires unique explicit load-combination identities", () => {
  const duplicate = api.buildCompressionDemandRowsFrom3D(
    [combination("ULS-1"), combination("ULS-1")], model
  );
  assert.equal(duplicate.success, false);
  assert.ok(duplicate.issues.some(x => x.includes("تکراری")));
  const missing = api.buildCompressionDemandRowsFrom3D(
    [{label:"",members:[{id:"M1",length:6,localEndForces:vector}]}], model
  );
  assert.equal(missing.success, false);
  assert.ok(missing.issues.some(x => x.includes("شناسه صریح")));
});

test("axial screening coverage requires a positive declared expected case count", () => {
  const rows = api.buildCompressionDemandRows({
    success:true,
    members:[{id:"M1",sectionKey:"column",ends:[{label:"ULS-1",values:vector}]}]
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].coverageComplete, false);
});

test("complete uniquely identified 3D combinations preserve full member coverage", () => {
  const result = api.buildCompressionDemandRowsFrom3D(
    [combination("ULS-1"), combination("ULS-2")], model
  );
  assert.equal(result.success, true, JSON.stringify(result.issues));
  assert.deepEqual(result.caseIds, ["ULS-1","ULS-2"]);
  assert.equal(result.members.length, 1);
  assert.equal(result.members[0].coverageComplete, true);
  assert.equal(result.members[0].caseCount, 2);
});
