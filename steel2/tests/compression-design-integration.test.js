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

test("null, empty, boolean and non-finite force components never coerce to zero", () => {
  for (const bad of [null, "", "   ", true, Infinity, NaN]) {
    const values = [1000,0,0,0,0,0,-1000,0,0,0,0,0];
    values[4] = bad;
    const rows = api.buildCompressionDemandRows({
      success:true, expectedCaseCount:1,
      members:[{id:"M1",sectionKey:"column",ends:[{label:"ULS-1",values}]}]
    });
    assert.equal(rows[0].coverageComplete,false, String(bad));
    assert.equal(rows[0].invalidCaseCount,1, String(bad));
  }
});

test("empty or duplicate load-case labels block complete coverage", () => {
  for (const ends of [
    [{label:"",values:[1000,0,0,0,0,0,-1000,0,0,0,0,0]}],
    [
      {label:"ULS-1",values:[1000,0,0,0,0,0,-1000,0,0,0,0,0]},
      {label:"ULS-1",values:[1200,0,0,0,0,0,-1200,0,0,0,0,0]}
    ]
  ]) {
    const rows=api.buildCompressionDemandRows({
      success:true,expectedCaseCount:ends.length,
      members:[{id:"M1",sectionKey:"column",ends}]
    });
    assert.equal(rows[0].coverageComplete,false);
  }
});

test("3D mapping rejects truncated and overlong 12-component member force vectors", () => {
  for (const badVector of [vector.slice(0,11), [...vector, 99]]) {
    const result = api.buildCompressionDemandRowsFrom3D(
      [{id:"ULS-BAD",members:[{id:"M1",length:6,localEndForces:badVector}]}],
      model
    );
    assert.equal(result.success, false);
    assert.ok(result.issues.some(x => x.includes("دقیقاً ۱۲ مؤلفه")));
    assert.equal(result.members[0].coverageComplete, false);
    assert.equal(result.members[0].invalidCaseCount, 1);
  }
});

test("3D mapping rejects nonnumeric force components without coercing them", () => {
  for (const bad of [null, "", "   ", true, Infinity, NaN]) {
    const badVector = vector.slice();
    badVector[5] = bad;
    const result = api.buildCompressionDemandRowsFrom3D(
      [{id:"ULS-BAD",members:[{id:"M1",length:6,localEndForces:badVector}]}],
      model
    );
    assert.equal(result.success, false, String(bad));
    assert.equal(result.members[0].coverageComplete, false, String(bad));
    assert.equal(result.members[0].invalidCaseCount, 1, String(bad));
  }
});
