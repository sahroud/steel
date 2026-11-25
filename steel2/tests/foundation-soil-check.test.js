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
    combinationDefinition: "تعریف ترکیب بهره‌برداری مستند در گزارش آزمایشی",
    columnOffsetXM: 0,
    columnOffsetZM: 0
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
  assert.deepEqual(mapped.horizontalReactionsKN, { Fx: -12, Fz: 5 });
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
  assert.equal(mapped.torsionalReactionKNm, -2.5);
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


test("includes explicit column axis offsets in footing resultant moments", () => {
  const r = api.checkRectangularFooting({
    ...base,
    cases: [{
      ...base.cases[0], NkN: 300,
      MxkNm: 0, MzkNm: 0,
      columnOffsetXM: 0.2, columnOffsetZM: -0.1
    }]
  }).results[0];
  assert.equal(r.resultantMxkNm, -30);
  assert.equal(r.resultantMzkNm, -60);
  assert.equal(r.eccentricityX_m, -60 / 396);
  assert.equal(r.eccentricityZ_m, -30 / 396);
});

test("requires explicit column-to-footing offsets, including intentional zero", () => {
  const c = { ...base.cases[0] };
  delete c.columnOffsetXM;
  assert.throws(() => api.checkRectangularFooting({
    ...base, cases: [c]
  }), /فاصله محور ستون/);
});

test("column offset can cause loss of full soil contact", () => {
  const r = api.checkRectangularFooting({
    ...base,
    cases: [{
      ...base.cases[0], NkN: 300,
      columnOffsetXM: 0.8, columnOffsetZM: 0
    }]
  }).results[0];
  assert.equal(r.fullContact, false);
  assert.equal(r.status, "blocked-no-tension-contact");
});


test("sliding check uses explicit friction data and biaxial horizontal resultant", () => {
  const r = api.checkFootingSliding({
    normalCompressionKN: 400,
    horizontalActionsKN: { Fx: 30, Fz: 40 },
    interfaceFrictionCoefficient: 0.5,
    requiredFactorOfSafety: 1.5,
    sourceReference: "گزارش ژئوتکنیک، بند اصطکاک سطح تماس",
    combinationDefinition: "ترکیب بار مستند کنترل لغزش"
  });
  assert.equal(r.horizontalResultantKN, 50);
  assert.equal(r.frictionResistanceKN, 200);
  assert.equal(r.factorOfSafety, 4);
  assert.equal(r.success, true);
});

test("sliding check rejects missing or invalid geotechnical inputs", () => {
  assert.throws(() => api.checkFootingSliding({
    normalCompressionKN: 100,
    horizontalActionsKN: { Fx: 10, Fz: 0 },
    requiredFactorOfSafety: 1.5,
    sourceReference: "report",
    combinationDefinition: "combination"
  }), /ضریب اصطکاک/);
  assert.throws(() => api.checkFootingSliding({
    normalCompressionKN: 0,
    horizontalActionsKN: { Fx: 10, Fz: 0 },
    interfaceFrictionCoefficient: 0.5,
    requiredFactorOfSafety: 1.5,
    sourceReference: "report",
    combinationDefinition: "combination"
  }), /نیروی قائم/);
});

test("sliding check reports failure when resistance is insufficient", () => {
  const r = api.checkFootingSliding({
    normalCompressionKN: 100,
    horizontalActionsKN: { Fx: 50, Fz: 0 },
    interfaceFrictionCoefficient: 0.2,
    requiredFactorOfSafety: 1.5,
    sourceReference: "report",
    combinationDefinition: "combination"
  });
  assert.equal(r.factorOfSafety, 0.4);
  assert.equal(r.success, false);
});
