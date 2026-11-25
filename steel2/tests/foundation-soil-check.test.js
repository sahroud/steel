"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const api = require("../js/foundation-soil-check.js");

const base = {
  soil: {
    soilType: "II",
    allowableBearingKPa: 200,
    allowableBearingBasis: "gross",
    sourceReference: "گزارش ژئوتکنیک آزمایشی، صفحه ۱۲"
  },
  Bm: 2,
  Lm: 2,
  footingLoads: {
    thicknessM: 0.6,
    soilCoverAboveFootingM: 0.5,
    concreteUnitWeightKNm3: 25,
    soilUnitWeightKNm3: 18
  },
  cases: [{
    name: "SLS-1",
    NkN: 300,
    MxkNm: 0,
    MzkNm: 0,
    sourceReference: "تحلیل آزمایشی، ترکیب بهره‌برداری مستند"
  }]
};

test("gross pressure includes footing and cover weights", () => {
  const r = api.checkRectangularFooting(base).results[0];
  assert.equal(r.NkN, 396);
  assert.equal(r.qAverageGrossKPa, 99);
  assert.equal(r.qMaxGrossKPa, 99);
  assert.equal(r.fullContact, true);
});

test("net pressure subtracts overburden to footing base", () => {
  const r = api.checkRectangularFooting({
    ...base,
    soil: { ...base.soil, allowableBearingBasis: "net" }
  }).results[0];
  assert.equal(r.overburdenAtBaseKPa, 18 * (0.5 + 0.6));
  assert.equal(r.qMaxNetKPa, 79.2);
  assert.equal(r.qMaxCheckedKPa, 79.2);
});

test("rejects ULS cases even if source is supplied", () => {
  assert.throws(() => api.checkRectangularFooting({
    ...base,
    cases: [{ ...base.cases[0], name: "ULS-1" }]
  }), /SLS/);
});

test("requires a geotechnical source", () => {
  assert.throws(() => api.checkRectangularFooting({
    ...base,
    soil: { ...base.soil, sourceReference: " " }
  }), /مرجع/);
});

test("blocks loss of full soil contact", () => {
  const r = api.checkRectangularFooting({
    ...base,
    cases: [{ ...base.cases[0], NkN: 100, MxkNm: 150, MzkNm: 150 }]
  }).results[0];
  assert.equal(r.fullContact, false);
  assert.equal(r.status, "blocked-no-tension-contact");
});

test("reaction mapping converts force and moment signs and units", () => {
  const mapped = api.mapSupportReactionToSlsCase({
    solverSuccess: true,
    equilibriumOK: true,
    loadCaseType: "SLS",
    sourceReference: "تحلیل آزمایشی، ترکیب SLS مستند",
    footingWidthAxis: "X",
    footingLengthAxis: "Z",
    verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-1",
      coordinatesM: { x: 0, y: 0, z: 6 },
      fixedDofs: [0, 1, 2],
      reactionN: { Fx: 12000, Fy: 300000, Fz: -5000 },
      reactionNm: { Mx: 20000000, Mz: -10000000 },
      units: { force: "N", moment: "N.m" }
    }
  });
  assert.equal(mapped.NkN, 300);
  assert.equal(mapped.MxkNm, -20);
  assert.equal(mapped.MzkNm, 10);
  assert.deepEqual(mapped.horizontalReactionsKN, { Fx: 12, Fz: -5 });
});

test("reaction mapping rejects ULS", () => {
  assert.throws(() => api.mapSupportReactionToSlsCase({
    solverSuccess: true,
    equilibriumOK: true,
    loadCaseType: "ULS",
    sourceReference: "test",
    footingWidthAxis: "X",
    footingLengthAxis: "Z",
    verticalAxis: "Y",
    ledgerEntry: {}
  }), /ULS/);
});

test("reaction mapping rejects wrong footing axes", () => {
  assert.throws(() => api.mapSupportReactionToSlsCase({
    solverSuccess: true,
    equilibriumOK: true,
    loadCaseType: "SLS",
    sourceReference: "test",
    footingWidthAxis: "Z",
    footingLengthAxis: "X",
    verticalAxis: "Y",
    ledgerEntry: {}
  }), /محور/);
});

test("reaction mapping requires equilibrium", () => {
  assert.throws(() => api.mapSupportReactionToSlsCase({
    solverSuccess: true,
    equilibriumOK: false,
    loadCaseType: "SLS",
    sourceReference: "test"
  }), /تعادل/);
});

test("reaction mapping requires all translational restraints", () => {
  assert.throws(() => api.mapSupportReactionToSlsCase({
    solverSuccess: true,
    equilibriumOK: true,
    loadCaseType: "SLS",
    sourceReference: "test",
    footingWidthAxis: "X",
    footingLengthAxis: "Z",
    verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-1",
      coordinatesM: { x: 0, y: 0, z: 0 },
      fixedDofs: [0, 1],
      reactionN: { Fx: 0, Fy: 1, Fz: 0 },
      reactionNm: { Mx: 0, Mz: 0 },
      units: { force: "N", moment: "N.m" }
    }
  }), /انتقالی/);
});
