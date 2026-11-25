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
    sourceReference: "تحلیل آزمایشی، ترکیب بهره‌برداری مستند",
    serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "تعریف ترکیب بهره‌برداری مستند در گزارش آزمایشی"
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

test("requires an explicit serviceability combination definition", () => {
  assert.throws(() => api.checkRectangularFooting({
    ...base,
    cases: [{ ...base.cases[0], combinationDefinition: "" }]
  }), /تعریف دقیق/);
});

test("requires the footing-bearing serviceability check type", () => {
  assert.throws(() => api.checkRectangularFooting({
    ...base,
    cases: [{ ...base.cases[0], serviceabilityCheck: "roof-deflection" }]
  }), /foundation-bearing/);
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
    serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr در حالت بهره‌برداری",
    footingWidthAxis: "X",
    footingLengthAxis: "Z",
    verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-1",
      coordinatesM: { x: 0, y: 0, z: 6 },
      fixedDofs: [0, 1, 2],
      reactionN: { Fx: 12000, Fy: 300000, Fz: -5000 },
      reactionNm: { Mx: 20000000, My: 3000000, Mz: -10000000 },
      units: { force: "N", moment: "N.m" }
    }
  });
  assert.equal(mapped.NkN, 300);
  assert.equal(mapped.MxkNm, -20);
  assert.equal(mapped.MzkNm, 10);
  assert.deepEqual(mapped.horizontalReactionsKN, { Fx: 12, Fz: -5 });
  assert.equal(mapped.torsionalReactionKNm, -3);
  assert.deepEqual(mapped.conversion, { vertical: "Fy solver reaction on structure is converted to positive downward compression on footing", moments: "Mx, My and Mz are reversed from support-on-structure to structure-on-footing", widthAxis: "X", lengthAxis: "Z", verticalAxis: "Y" });
});

test("reaction mapping requires footing-bearing check metadata", () => {
  assert.throws(() => api.mapSupportReactionToSlsCase({
    solverSuccess: true,
    equilibriumOK: true,
    loadCaseType: "SLS",
    sourceReference: "test",
    serviceabilityCheck: "roof-deflection",
    combinationDefinition: "D + L",
    footingWidthAxis: "X",
    footingLengthAxis: "Z",
    verticalAxis: "Y",
    ledgerEntry: {}
  }), /foundation-bearing/);
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
    serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr",
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
    serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr",
    footingWidthAxis: "X",
    footingLengthAxis: "Z",
    verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-1",
      coordinatesM: { x: 0, y: 0, z: 0 },
      fixedDofs: [0, 1],
      reactionN: { Fx: 0, Fy: 1, Fz: 0 },
      reactionNm: { Mx: 0, My: 0, Mz: 0 },
      units: { force: "N", moment: "N.m" }
    }
  }), /انتقالی/);
});

test("reaction mapping preserves the support identity and coordinates", () => {
  const mapped = api.mapSupportReactionToSlsCase({
    solverSuccess: true, equilibriumOK: true, loadCaseType: "SLS",
    sourceReference: "تحلیل آزمایشی، ترکیب SLS مستند",
    serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr؛ تعریف آزمایشی",
    footingWidthAxis: "X", footingLengthAxis: "Z", verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-west-02",
      coordinatesM: { x: -6, y: 0, z: 18 },
      fixedDofs: [0, 1, 2],
      reactionN: { Fx: 0, Fy: 250000, Fz: 0 },
      reactionNm: { Mx: 0, My: 0, Mz: 0 },
      units: { force: "N", moment: "N.m" }
    }
  });
  assert.equal(mapped.supportNodeId, "base-west-02");
  assert.deepEqual(mapped.supportCoordinatesM, { x: -6, y: 0, z: 18 });
});

test("reaction mapping rejects incomplete or non-finite reaction ledger values", () => {
  const input = {
    solverSuccess: true, equilibriumOK: true, loadCaseType: "SLS",
    sourceReference: "تحلیل آزمایشی",
    serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr؛ تعریف آزمایشی",
    footingWidthAxis: "X", footingLengthAxis: "Z", verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-1",
      coordinatesM: { x: 0, y: 0, z: 0 },
      fixedDofs: [0, 1, 2],
      reactionN: { Fx: 0, Fy: 250000, Fz: 0 },
      reactionNm: { Mx: 0, My: 0, Mz: 0 },
      units: { force: "N", moment: "N.m" }
    }
  };
  assert.throws(() => api.mapSupportReactionToSlsCase({
    ...input, ledgerEntry: { ...input.ledgerEntry, reactionN: { Fx: 0, Fy: "bad", Fz: 0 } }
  }), /عدد محدود/);
  assert.throws(() => api.mapSupportReactionToSlsCase({
    ...input, ledgerEntry: { ...input.ledgerEntry, units: { force: "kN", moment: "N.m" } }
  }), /واحدها/);
});


test("reaction mapping preserves finite coordinates and torsional reaction", () => {
  const mapped = api.mapSupportReactionToSlsCase({
    solverSuccess: true, equilibriumOK: true, loadCaseType: "SLS",
    sourceReference: "test source", serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr", footingWidthAxis: "X",
    footingLengthAxis: "Z", verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-a", coordinatesM: { x: 1.25, y: 0, z: 7.5 },
      fixedDofs: [0, 1, 2],
      reactionN: { Fx: 1000, Fy: 200000, Fz: -2000 },
      reactionNm: { Mx: 4000000, My: 2500000, Mz: -6000000 },
      units: { force: "N", moment: "N.m" }
    }
  });
  assert.deepEqual(mapped.supportCoordinatesM, { x: 1.25, y: 0, z: 7.5 });
  assert.equal(mapped.torsionalReactionKNm, 2.5);
});

test("reaction mapping blocks uplift without an anchorage model", () => {
  assert.throws(() => api.mapSupportReactionToSlsCase({
    solverSuccess: true, equilibriumOK: true, loadCaseType: "SLS",
    sourceReference: "test source", serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr", footingWidthAxis: "X",
    footingLengthAxis: "Z", verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-uplift", coordinatesM: { x: 0, y: 0, z: 0 },
      fixedDofs: [0, 1, 2],
      reactionN: { Fx: 0, Fy: -10000, Fz: 0 },
      reactionNm: { Mx: 0, My: 0, Mz: 0 },
      units: { force: "N", moment: "N.m" }
    }
  }), /بلندکننده/);
});

test("reaction mapping rejects non-finite torsion and coordinates", () => {
  const input = {
    solverSuccess: true, equilibriumOK: true, loadCaseType: "SLS",
    sourceReference: "test source", serviceabilityCheck: "foundation-bearing",
    combinationDefinition: "D + Lr", footingWidthAxis: "X",
    footingLengthAxis: "Z", verticalAxis: "Y",
    ledgerEntry: {
      nodeId: "base-invalid", coordinatesM: { x: 0, y: 0, z: 0 },
      fixedDofs: [0, 1, 2],
      reactionN: { Fx: 0, Fy: 100000, Fz: 0 },
      reactionNm: { Mx: 0, My: 0, Mz: 0 },
      units: { force: "N", moment: "N.m" }
    }
  };
  assert.throws(() => api.mapSupportReactionToSlsCase({
    ...input, ledgerEntry: { ...input.ledgerEntry, coordinatesM: { x: NaN, y: 0, z: 0 } }
  }), /مختصات X/);
  assert.throws(() => api.mapSupportReactionToSlsCase({
    ...input, ledgerEntry: { ...input.ledgerEntry, reactionNm: { Mx: 0, My: Infinity, Mz: 0 } }
  }), /واکنش My/);
});
