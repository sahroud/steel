/* Reference tests for the 3D frame solver.
 * Run from repository root with: node --test steel2/tests/analysis-3d-reference.test.js
 * These are solver verification fixtures, not code-compliance tests.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/analysis-3d.js");

const solver = globalThis.SteelFrame3D;
const section = {
  E: 200e9,
  G: 80e9,
  A: 0.01,
  Iy: 1e-5,
  Iz: 1e-5,
  J: 1e-6
};

function axialBar(load) {
  const model = {
    nodes: [
      { id: "N1", x: 0, y: 0, z: 0 },
      { id: "N2", x: 2, y: 0, z: 0 }
    ],
    members: [
      {
        id: "M1",
        type: "reference axial member",
        start: "N1",
        end: "N2",
        sectionKey: "reference",
        analysisLoad: load ? { uniformLocal: load } : undefined
      }
    ]
  };
  return solver.analyze(model, {
    sectionResolver: () => section,
    supports: [
      { nodeId: "N1", fixedDofs: [0, 1, 2, 3, 4, 5] },
      { nodeId: "N2", fixedDofs: [1, 2, 3, 4, 5] }
    ]
  });
}

test("axial nodal load: displacement equals PL/EA and reaction balances", () => {
  const P = 1000;
  const L = 2;
  const result = solver.analyze({
    nodes: [
      { id: "N1", x: 0, y: 0, z: 0 },
      { id: "N2", x: L, y: 0, z: 0 }
    ],
    members: [{ id: "M1", start: "N1", end: "N2", sectionKey: "reference" }]
  }, {
    sectionResolver: () => section,
    supports: [
      { nodeId: "N1", fixedDofs: [0, 1, 2, 3, 4, 5] },
      { nodeId: "N2", fixedDofs: [1, 2, 3, 4, 5] }
    ],
    nodalLoads: [{ nodeId: "N2", values: [P, 0, 0, 0, 0, 0] }]
  });

  const expected = P * L / (section.E * section.A);
  const actual = result.displacements.find(n => n.nodeId === "N2").values[0];
  assert.ok(Math.abs(actual - expected) <= Math.max(1e-12, expected * 1e-8),
    `expected axial displacement ${expected}, received ${actual}`);
  assert.equal(result.equilibrium.ok, true);
  assert.ok(Math.abs(result.equilibrium.supportReactionN[0] + P) < 1e-6);
});

test("uniform local axial member load: displacement equals qL²/(2EA)", () => {
  const q = 1000;
  const L = 2;
  const result = axialBar([q, 0, 0]);
  const expected = q * L * L / (2 * section.E * section.A);
  const actual = result.displacements.find(n => n.nodeId === "N2").values[0];

  assert.ok(Math.abs(actual - expected) <= Math.max(1e-12, expected * 1e-8),
    `expected axial displacement ${expected}, received ${actual}`);
  assert.equal(result.equilibrium.ok, true);
  assert.ok(Math.abs(result.equilibrium.supportReactionN[0] + q * L) < 1e-6);
});

test("solver rejects a member whose endpoint is absent", () => {
  assert.throws(() => solver.analyze({
    nodes: [{ id: "N1", x: 0, y: 0, z: 0 }],
    members: [{ id: "M1", start: "N1", end: "MISSING", sectionKey: "reference" }]
  }, {
    sectionResolver: () => section,
    supports: [{ nodeId: "N1", fixedDofs: [0, 1, 2, 3, 4, 5] }]
  }), /گره ابتدا یا انتهای عضو M1 یافت نشد/);
});

test("solver rejects non-positive section properties", () => {
  assert.throws(() => solver.analyze({
    nodes: [
      { id: "N1", x: 0, y: 0, z: 0 },
      { id: "N2", x: 1, y: 0, z: 0 }
    ],
    members: [{ id: "M1", start: "N1", end: "N2", sectionKey: "reference" }]
  }, {
    sectionResolver: () => ({ ...section, A: 0 }),
    supports: [{ nodeId: "N1", fixedDofs: [0, 1, 2, 3, 4, 5] }]
  }), /خاصیت A برای عضو M1 ناقص یا نامعتبر است/);
});


test("cantilever lateral nodal load: deflection equals PL^3/(3EIz)", () => {
  const P = 500;
  const L = 3;
  const result = solver.analyze({
    nodes: [
      { id: "FIX", x: 0, y: 0, z: 0 },
      { id: "TIP", x: L, y: 0, z: 0 }
    ],
    members: [{ id: "CANT", start: "FIX", end: "TIP", sectionKey: "reference" }]
  }, {
    sectionResolver: () => section,
    supports: [{ nodeId: "FIX", fixedDofs: [0, 1, 2, 3, 4, 5] }],
    nodalLoads: [{ nodeId: "TIP", values: [0, P, 0, 0, 0, 0] }]
  });

  const expected = P * L ** 3 / (3 * section.E * section.Iz);
  const actual = result.displacements.find(n => n.nodeId === "TIP").values[1];
  assert.ok(Math.abs(actual - expected) <= Math.max(1e-12, expected * 1e-8),
    `expected cantilever deflection ${expected}, received ${actual}`);
  assert.equal(result.equilibrium.ok, true);
  assert.ok(Math.abs(result.equilibrium.supportReactionN[1] + P) < 1e-6);
  assert.ok(Math.abs(result.equilibrium.supportMomentNm[2] + P * L) < 1e-6);
});

test("six-component nodal action: applied Y moment is included in global equilibrium", () => {
  const M = 1200;
  const L = 3;
  const result = solver.analyze({
    nodes: [
      { id: "FIX", x: 0, y: 0, z: 0 },
      { id: "TIP", x: L, y: 0, z: 0 }
    ],
    members: [{ id: "CANT-M", start: "FIX", end: "TIP", sectionKey: "reference" }]
  }, {
    sectionResolver: () => section,
    supports: [{ nodeId: "FIX", fixedDofs: [0, 1, 2, 3, 4, 5] }],
    nodalLoads: [{ nodeId: "TIP", values: [0, 0, 0, 0, M, 0] }]
  });
  assert.equal(result.equilibrium.ok, true);
  assert.ok(Math.abs(result.equilibrium.supportMomentNm[1] + M) < 1e-6);
});

test("solver rejects an unstable unsupported model", () => {
  assert.throws(() => solver.analyze({
    nodes: [
      { id: "A", x: 0, y: 0, z: 0 },
      { id: "B", x: 2, y: 0, z: 0 }
    ],
    members: [{ id: "M", start: "A", end: "B", sectionKey: "reference" }]
  }, {
    sectionResolver: () => section,
    supports: []
  }), /تکین|نامعتبر|DOF_SINGULAR/);
});


const loadTransfer = require("../js/load-transfer.js");

test("surface pressure converts to tributary line load with kN/m units", () => {
  assert.equal(globalThis.SteelLoadTransfer.surfacePressureToLineLoad(1.25, 2.4), 3);
  assert.ok(Math.abs(globalThis.SteelLoadTransfer.surfacePressureToLineLoad(-0.8, 1.5) + 1.2) < 1e-12);
});
test("roof load on horizontal projected area uses cosine projection for sloped tributary width", () => {
  const angle = Math.atan2(2, 3);
  const result = globalThis.SteelLoadTransfer.roofSurfacePressureToLineLoad(2, 5, angle, "horizontal-projection");
  assert.ok(Math.abs(result.effectiveTributaryWidthM - 3 * 5 / Math.sqrt(13)) < 1e-12);
  assert.ok(Math.abs(result.lineLoadKNm - 2 * 5 * 3 / Math.sqrt(13)) < 1e-12);
  assert.equal(result.areaBasis, "horizontal-projection");
});

test("roof load on actual sloped area does not apply a second cosine projection", () => {
  const angle = Math.atan2(2, 3);
  const result = globalThis.SteelLoadTransfer.roofSurfacePressureToLineLoad(2, 5, angle, "sloped-surface");
  assert.equal(result.effectiveTributaryWidthM, 5);
  assert.equal(result.lineLoadKNm, 10);
  assert.equal(result.projectionFactor, 1);
});

test("roof tributary line loads conserve pressure times horizontal plan width", () => {
  const spanHalf = 3, rise = 2, angle = Math.atan2(rise, spanHalf);
  const slopedWidth = Math.hypot(spanHalf, rise), pressure = 1.7;
  const count = 8;
  const widths = globalThis.SteelLoadTransfer.equalStationTributaryWidths(slopedWidth, count);
  const totalLineLoad = widths.reduce((sum, width) =>
    sum + globalThis.SteelLoadTransfer.roofSurfacePressureToLineLoad(
      pressure, width, angle, "horizontal-projection"
    ).lineLoadKNm, 0);
  assert.ok(Math.abs(totalLineLoad - pressure * spanHalf) < 1e-12);
});

test("roof load transfer rejects an unspecified area basis and invalid slope angle", () => {
  const convert = globalThis.SteelLoadTransfer.roofSurfacePressureToLineLoad;
  assert.throws(() => convert(1, 2, 0.2, "unspecified"), /مبنای سطح/);
  assert.throws(() => convert(1, 2, Math.PI / 2, "horizontal-projection"), /زاویه سقف/);
});


test("roof purlin tributary widths conserve the full sloped roof area width", () => {
  const slopeLength = 6.5;
  const intervals = 7;
  const widths = globalThis.SteelLoadTransfer.equalStationTributaryWidths(slopeLength, intervals);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  assert.ok(Math.abs(totalWidth - slopeLength) < 1e-12);
  const pressure = 1.1;
  const totalLineLoad = widths.reduce((sum, width) =>
    sum + globalThis.SteelLoadTransfer.surfacePressureToLineLoad(pressure, width), 0);
  assert.ok(Math.abs(totalLineLoad - pressure * slopeLength) < 1e-12);
});

test("ridge pressure transfer keeps left and right tributary widths separate", () => {
  const leftWidth = 0.45;
  const rightWidth = 0.55;
  const left = globalThis.SteelLoadTransfer.surfacePressureToLineLoad(1.0, leftWidth);
  const right = globalThis.SteelLoadTransfer.surfacePressureToLineLoad(1.6, rightWidth);
  assert.ok(Math.abs(left + right - 1.33) < 1e-12);
});

test("load transfer rejects invalid tributary widths", () => {
  assert.throws(() => globalThis.SteelLoadTransfer.surfacePressureToLineLoad(1, -0.1), /عرض بارگیر/);
  assert.throws(() => globalThis.SteelLoadTransfer.surfacePressureToLineLoad(1, NaN), /عرض بارگیر/);
});


test("triangular gable wind resultant and centroid match closed-form geometry", () => {
  const result = globalThis.SteelLoadTransfer.triangularGableWindResultant(1.2, 12, 2);
  assert.equal(result.areaM2, 12);
  assert.ok(Math.abs(result.resultantKN - 14.4) < 1e-12);
  assert.equal(result.centroidXFromLeftM, 6);
  assert.ok(Math.abs(result.centroidYAboveEaveM - 2 / 3) < 1e-12);
});

test("triangular gable resultant preserves suction sign", () => {
  const result = globalThis.SteelLoadTransfer.triangularGableWindResultant(-0.5, 10, 1.5);
  assert.equal(result.resultantKN, -3.75);
});


test("triangular gable post-equivalent actions conserve full force and base moment including edge tributaries", () => {
  const pressure = 1.2;
  const span = 12;
  const rise = 2;
  const eave = 6;
  const intervals = 4;
  const actions = globalThis.SteelLoadTransfer.triangularGablePostEquivalentLoads(
    pressure, span, rise, eave, intervals
  );
  const totalArea = actions.reduce((sum, item) => sum + item.tributaryAreaM2, 0);
  const totalForce = actions.reduce((sum, item) => sum + item.baseForceKN + item.topForceKN, 0);
  const totalMoment = actions.reduce((sum, item) =>
    sum + item.topForceKN * item.supportHeightM, 0);
  const totalMomentY = actions.reduce((sum, item) =>
    sum + item.momentYAboutSupportKNm - item.xM * item.resultantKN, 0);
  const expectedArea = span * rise / 2;
  const expectedForce = pressure * expectedArea;
  const expectedMoment = pressure * (eave * expectedArea + span * rise ** 2 / 6);
  const expectedMomentY = -pressure * span * expectedArea / 2;
  assert.ok(Math.abs(totalArea - expectedArea) < 1e-12);
  assert.ok(Math.abs(totalForce - expectedForce) < 1e-12);
  assert.ok(Math.abs(totalMoment - expectedMoment) < 1e-12);
  assert.ok(Math.abs(totalMomentY - expectedMomentY) < 1e-12);
  assert.equal(actions.length, intervals + 1);
  assert.ok(actions[0].tributaryAreaM2 > 0 && actions.at(-1).tributaryAreaM2 > 0);
});

test("triangular gable post-equivalent actions preserve suction sign and reject invalid geometry", () => {
  const actions = globalThis.SteelLoadTransfer.triangularGablePostEquivalentLoads(-0.5, 10, 1.5, 5, 5);
  assert.ok(actions.every(item => item.resultantKN <= 0));
  assert.throws(() =>
    globalThis.SteelLoadTransfer.triangularGablePostEquivalentLoads(1, 10, 1, 0, 4),
    /ارتفاع لبه بام/
  );
});


test("preliminary 3D wind combinations expose both signs and all existing gravity patterns", () => {
  const combos = globalThis.SteelLoadTransfer.preliminaryWindCombinations();
  assert.equal(combos.length, 6);
  assert.deepEqual(combos.map(item => item.key), [
    "comboWind08P", "comboWind08N",
    "comboLiveWind08P", "comboLiveWind08N",
    "comboSnowWind08P", "comboSnowWind08N"
  ]);
  assert.deepEqual(combos.map(item => item.sign), [1, -1, 1, -1, 1, -1]);
  assert.deepEqual(combos[0] && [combos[0].dead, combos[0].wind], [0.8, 1.6]);
  assert.deepEqual(combos[2] && [combos[2].dead, combos[2].live, combos[2].snow, combos[2].wind], [1.2, 1.6, 0.5, 0.8]);
  assert.deepEqual(combos[4] && [combos[4].dead, combos[4].live, combos[4].snow, combos[4].wind], [1.2, 0.5, 1.6, 0.8]);
});

test("preliminary 3D wind combination definitions are immutable", () => {
  const combos = globalThis.SteelLoadTransfer.preliminaryWindCombinations();
  assert.equal(Object.isFrozen(combos), true);
  assert.equal(Object.isFrozen(combos[0]), true);
});


test("wind-zone pressure helper calculates both internal-pressure signs", () => {
  const zones = {
    "roof-left": 0.8, "roof-right": -0.5,
    "long-wall-left": 0.7, "long-wall-right": -0.6,
    "end-wall-front": 0.9, "end-wall-back": -0.4
  };
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh: 360,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: 0.2
    },
    zones
  });
  assert.equal(result.ready, true);
  assert.ok(Math.abs(result.q - 6.13) < 1e-12);
  assert.ok(Math.abs(result.rows["roof-left"].external - 4.904) < 1e-12);
  assert.ok(Math.abs(result.rows["roof-left"].netInternalPositive - 3.678) < 1e-12);
  assert.ok(Math.abs(result.rows["roof-left"].netInternalNegative - 6.13) < 1e-12);
  assert.ok(Math.abs(result.rows["roof-right"].netInternalPositive + 4.291) < 1e-12);
  assert.ok(Math.abs(result.rows["roof-right"].netInternalNegative + 1.839) < 1e-12);
});

test("wind-zone pressure helper fails closed when required coefficients or zone Cp are missing", () => {
  const input = {
    direction:"transverse-positive",
    basicWindKmh: 360,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1
    },
    zones: { "roof-left": 0.8, "roof-right": 0.5, "long-wall-left": 0.7, "long-wall-right": -0.6, "end-wall-front": 0.9, "end-wall-back": -0.4 }
  };
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures(input);
  assert.equal(result.ready, false);
  assert.equal(result.rows["roof-left"], null);
  assert.equal(result.rows["roof-right"], null);
});

test("wind-zone pressure helper rejects negative wind speed without producing pressures", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh: -10,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: 0.2
    },
    zones: { "roof-left": 0.8, "roof-right": -0.5, "long-wall-left": 0.7, "long-wall-right": -0.6, "end-wall-front": 0.9, "end-wall-back": -0.4 }
  });
  assert.equal(result.ready, false);
  assert.equal(result.q, null);
});


test("wind-zone pressure helper rejects negative amplification factors", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh: 360,
    coefficients: {
      importance: 1, exposure: -1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: 0.2
    },
    zones: { "roof-left": 0.8, "roof-right": -0.5, "long-wall-left": 0.7, "long-wall-right": -0.6, "end-wall-front": 0.9, "end-wall-back": -0.4 }
  });
  assert.equal(result.ready, false);
  assert.equal(result.rows["roof-left"], null);
});

test("wind-zone pressure helper preserves signed internal pressure while validating factors", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh: 360,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: -0.2
    },
    zones: { "roof-left": 0.8, "roof-right": -0.5, "long-wall-left": 0.7, "long-wall-right": -0.6, "end-wall-front": 0.9, "end-wall-back": -0.4 }
  });
  assert.equal(result.ready, true);
  assert.ok(Math.abs(result.rows["roof-left"].netInternalPositive - 3.678) < 1e-12);
  assert.ok(Math.abs(result.rows["roof-left"].netInternalNegative - 6.13) < 1e-12);
});

test("wind-zone pressure helper accepts zero basic wind as zero pressure", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh: 0,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: 0.2
    },
    zones: { "roof-left": 0.8, "roof-right": -0.5, "long-wall-left": 0.7, "long-wall-right": -0.6, "end-wall-front": 0.9, "end-wall-back": -0.4 }
  });
  assert.equal(result.ready, true);
  assert.equal(result.q, 0);
  assert.equal(result.rows["roof-left"].netInternalPositive, 0);
});


const craneDesign = require("../js/crane-design.js");

test("crane subsystem offers only selectable 5, 10 and 20 tonne rated capacities", () => {
  assert.deepEqual(craneDesign.CAPACITIES_TONNES, [5, 10, 20]);
  for (const capacityTonnes of [5, 10, 20]) {
    const config = craneDesign.createConfiguration({capacityTonnes});
    assert.equal(config.capacity.value, capacityTonnes);
    assert.equal(config.capacity.unit, "t");
    assert.equal(config.enabled, false);
    assert.equal(craneDesign.assessReadiness(config).ready, false);
  }
});

test("crane subsystem rejects unsupported capacities and invalid positive dimensions", () => {
  assert.throws(() => craneDesign.createConfiguration({capacityTonnes: 15}), /۵، ۱۰ یا ۲۰/);
  assert.throws(() => craneDesign.createConfiguration({capacityTonnes: 10, craneSpanM: -4}), /مثبت و محدود/);
});

test("crane design readiness fails closed until geometry duty and verified source exist", () => {
  const incomplete = craneDesign.createConfiguration({capacityTonnes: 20});
  assert.equal(craneDesign.assessReadiness(incomplete).ready, false);
  const complete = craneDesign.createConfiguration({
    capacityTonnes: 10, craneSpanM: 20, runwayLengthM: 36, hookLiftM: 6,
    dutyClass: "documented-duty-class", cyclesPerHour: 12,
    provenanceMode: "manufacturer", verified: true, sourceReference: "supplier-load-chart.pdf"
  });
  assert.equal(craneDesign.assessReadiness(complete).ready, true);
});



test("wind procedure screening selects low-rise combined coefficients for the 12x36 Shahrud shed geometry",()=>{
  const result=globalThis.SteelLoadTransfer.classifyWindProcedure({span:12,length:36,height:6,rise:2});
  assert.equal(result.ready,true);
  assert.equal(result.method,"low-rise-combined-coefficients");
  assert.equal(result.coefficientConvention,"combined-GCp; do-not-apply-G-separately");
  assert.equal(result.codeClause,"6-10-9");
  assert.equal(result.meanRoofHeightM,7);
  assert.equal(result.smallerPlanDimensionM,12);
  assert.ok(Math.abs(result.heightToSmallerPlanRatio-7/12)<1e-12);
  assert.equal(result.cAndCRequiredIndependently,true);
});

test("wind procedure screening does not classify height or ratio boundary as low-rise",()=>{
  const heightBoundary=globalThis.SteelLoadTransfer.classifyWindProcedure({span:12,length:36,height:19,rise:2});
  const ratioBoundary=globalThis.SteelLoadTransfer.classifyWindProcedure({span:12,length:36,height:11,rise:2});
  assert.equal(heightBoundary.method,"general-or-other-applicable-method");
  assert.equal(ratioBoundary.heightToSmallerPlanRatio,1);
  assert.equal(ratioBoundary.method,"general-or-other-applicable-method");
});

test("wind procedure screening fails closed for incomplete or invalid geometry",()=>{
  const missing=globalThis.SteelLoadTransfer.classifyWindProcedure({span:12,length:36,height:6});
  const invalid=globalThis.SteelLoadTransfer.classifyWindProcedure({span:0,length:36,height:6,rise:2});
  assert.equal(missing.ready,false);
  assert.equal(missing.method,"undetermined");
  assert.equal(invalid.ready,false);
});

test("six-zone pressure mapping transfers signed pressures to roof, side-wall and end-wall members",()=>{
  const p=globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh:360,coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}});
  const model={members:[
    {id:"PL",sectionKey:"roofPurlin",side:"left",tributaryWidth:2},{id:"PR",sectionKey:"roofPurlin",side:"right",tributaryWidth:3},
    {id:"PG",sectionKey:"roofPurlin",side:"ridge",tributaryWidth:4,tributaryWidthLeft:1.5,tributaryWidthRight:2.5},
    {id:"WL",sectionKey:"wallGirt",side:"left",tributaryHeight:1.2},{id:"WR",sectionKey:"wallGirt",side:"right",tributaryHeight:1.2},
    {id:"EF",sectionKey:"endGirt",endFace:"front",tributaryHeight:1.5},{id:"ER",sectionKey:"endGirt",endFace:"rear",tributaryHeight:1.5}]};
  const m=globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers(model,p,"positive");
  assert.ok(Math.abs(m.memberLoads.PL.windLeft-3.678*2)<1e-12);
  assert.ok(Math.abs(m.memberLoads.PR.windRight-(-4.291)*3)<1e-12);
  assert.ok(Math.abs(m.memberLoads.PG.windLeft-3.678*1.5)<1e-12);
  assert.ok(Math.abs(m.memberLoads.PG.windRight-(-4.291)*2.5)<1e-12);
  assert.ok(Math.abs(m.memberLoads.WL.wind-3.065*1.2)<1e-12);
  assert.ok(Math.abs(m.memberLoads.WR.wind-(-4.904)*1.2)<1e-12);
  assert.ok(Math.abs(m.memberLoads.EF.windEnd-4.291*1.5)<1e-12);
  assert.ok(Math.abs(m.memberLoads.ER.windEnd-(-3.678)*1.5)<1e-12);
  assert.equal(m.counts.roofPurlins,3);assert.ok(Math.abs(m.endFacePressures.front-4.291)<1e-12);
});

test("six-zone pressure mapping fails closed for incomplete data, bad scenario or missing member groups",()=>{
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({members:[]},null,"positive"),/فشارهای شش‌ناحیه‌ای/);
  const p=globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh:360,coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}});
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({members:[]},p,"unspecified"),/positive یا negative/);
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({members:[{id:"x",sectionKey:"roofPurlin",side:"left",tributaryWidth:-1}]},p,"positive"),/عرض بارگیر/);
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({members:[{id:"x",sectionKey:"roofPurlin",side:"left",tributaryWidth:1}]},p,"positive"),/نیازمند پرلین/);
});

test("six-zone application adapter replaces only wind line loads and preserves gravity loads",()=>{
  const pressure=globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh:360,
    coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},
    zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}
  });
  const source={members:[
    {id:"P1",sectionKey:"roofPurlin",side:"left",tributaryWidth:2,lineLoads:{dead:8,live:2,windLeft:999}},
    {id:"W1",sectionKey:"wallGirt",side:"left",tributaryHeight:1.2,lineLoads:{dead:3,wind:999}},
    {id:"E1",sectionKey:"endGirt",endFace:"rear",tributaryHeight:1.5,lineLoads:{dead:4,windEnd:999}}
  ]};
  const applied=globalThis.SteelLoadTransfer.applyWindZonePressureMapping(source,pressure,"positive");
  assert.equal(applied.model.members[0].lineLoads.dead,8);
  assert.equal(applied.model.members[0].lineLoads.live,2);
  assert.ok(Math.abs(applied.model.members[0].lineLoads.windLeft-3.678*2)<1e-12);
  assert.ok(Math.abs(applied.model.members[1].lineLoads.wind-3.065*1.2)<1e-12);
  assert.ok(Math.abs(applied.model.members[2].lineLoads.windEnd-(-3.678)*1.5)<1e-12);
  assert.ok(Math.abs(applied.mapping.endFacePressures.front-4.291)<1e-12);
  assert.ok(Math.abs(applied.mapping.endFacePressures.rear-(-3.678))<1e-12);
  assert.equal(source.members[0].lineLoads.windLeft,999,"source model must not be mutated");
});

test("six-zone negative internal-pressure scenario keeps zone signs independently",()=>{
  const pressure=globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"transverse-positive",
    basicWindKmh:360,
    coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},
    zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}
  });
  const model={members:[
    {id:"P-L",sectionKey:"roofPurlin",side:"left",tributaryWidth:1},
    {id:"P-R",sectionKey:"roofPurlin",side:"right",tributaryWidth:1},
    {id:"W-L",sectionKey:"wallGirt",side:"left",tributaryHeight:1},
    {id:"W-R",sectionKey:"wallGirt",side:"right",tributaryHeight:1},
    {id:"E-F",sectionKey:"endGirt",endFace:"front",tributaryHeight:1},
    {id:"E-R",sectionKey:"endGirt",endFace:"rear",tributaryHeight:1}
  ]};
  const result=globalThis.SteelLoadTransfer.applyWindZonePressureMapping(model,pressure,"negative");
  assert.ok(Math.abs(result.model.members[0].lineLoads.windLeft-6.13)<1e-12);
  assert.ok(Math.abs(result.model.members[1].lineLoads.windRight-(-1.839))<1e-12);
  assert.ok(Math.abs(result.model.members[2].lineLoads.wind-5.517)<1e-12);
  assert.ok(Math.abs(result.model.members[3].lineLoads.wind-(-2.452))<1e-12);
  assert.ok(Math.abs(result.mapping.endFacePressures.front-6.743)<1e-12);
  assert.ok(Math.abs(result.mapping.endFacePressures.rear-(-1.226))<1e-12);
});

test("wind pressure calculation requires one of four wind directions and all six surface coefficients",()=>{
  const base={basicWindKmh:360,coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},
    zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}};
  assert.equal(globalThis.SteelLoadTransfer.calculateWindZonePressures(base).ready,false);
  assert.equal(globalThis.SteelLoadTransfer.calculateWindZonePressures({...base,direction:"transverse-positive",zones:{"roof-left":0.8}}).ready,false);
  const complete=globalThis.SteelLoadTransfer.calculateWindZonePressures({...base,direction:"longitudinal-negative"});
  assert.equal(complete.ready,true);
  assert.equal(complete.direction,"longitudinal-negative");
});

test("wind mapper records the explicit wind axis and direction",()=>{
  const pressure=globalThis.SteelLoadTransfer.calculateWindZonePressures({
    direction:"longitudinal-positive",basicWindKmh:360,
    coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},
    zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}
  });
  const model={geometry:{span:12,length:36,height:6,rise:2},members:[
    {id:"P",sectionKey:"roofPurlin",side:"left",tributaryWidth:1},
    {id:"W",sectionKey:"wallGirt",side:"left",tributaryHeight:1},
    {id:"E",sectionKey:"endGirt",endFace:"front",tributaryHeight:1}
  ]};
  const mapped=globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers(model,pressure,"positive");
  assert.equal(mapped.windDirection,"longitudinal-positive");
  assert.equal(mapped.windProcedure.method,"low-rise-combined-coefficients");
  assert.equal(mapped.windProcedure.codeClause,"6-10-9");
  assert.equal(mapped.applicationScope,"preliminary-global-surface-pressure");
  assert.equal(mapped.componentsCladdingStatus,"not-independently-designed");
  assert.equal(mapped.codeComplianceStatus,"not-established");
  assert.match(mapped.designWarning,/MWFRS.*components-and-cladding/);
});

test("service wind drift check compares relative top-to-base movement with 0.0025H",()=>{
  const model={geometry:{height:4},nodes:[
    {id:"B1",x:0,y:0,z:0},{id:"T1",x:0,y:4,z:0},
    {id:"B2",x:8,y:0,z:0},{id:"T2",x:8,y:4,z:0}
  ],members:[]};
  const displacements=[
    {nodeId:"B1",values:[0,0,0]},{nodeId:"T1",values:[0.005,0,0]},
    {nodeId:"B2",values:[0,0,0]},{nodeId:"T2",values:[0.012,0,0]}
  ];
  const result=globalThis.SteelLoadTransfer.checkWindDrift(model,displacements,"transverse-positive");
  assert.equal(result.ready,true);
  assert.equal(result.ok,false);
  assert.ok(Math.abs(result.driftRatio-0.003)<1e-12);
  assert.equal(result.limitRatio,0.0025);
  assert.equal(result.criticalPair.topNodeId,"T2");
});

test("service wind drift check fails closed when base-to-top displacement pairs are unavailable",()=>{
  const result=globalThis.SteelLoadTransfer.checkWindDrift(
    {geometry:{height:4},nodes:[{id:"T",x:0,y:4,z:0}],members:[]},
    [{nodeId:"T",values:[0.01,0,0]}],"longitudinal-positive"
  );
  assert.equal(result.ready,false);
  assert.equal(result.ok,false);
});


test("C&C rectangular effective area is calculated from explicit tributary geometry only", () => {
  const result = globalThis.SteelLoadTransfer.calculateRectangularEffectiveWindArea({
    component:"roof-purlin", tributaryWidthM:1.2, loadedLengthM:6,
    areaBasis:"sloped-surface"
  });
  assert.ok(Math.abs(result.effectiveAreaM2 - 7.2) < 1e-12);
  assert.equal(result.geometryMethod, "rectangular-tributary-patch");
  assert.equal(result.verificationStatus, "geometry-only-not-code-verified");
  assert.equal(result.pressureReady, false);
  assert.equal(result.coefficientSource, null);
});

test("C&C effective-area helper rejects missing dimensions and ambiguous area basis", () => {
  const helper = globalThis.SteelLoadTransfer.calculateRectangularEffectiveWindArea;
  assert.throws(() => helper({tributaryWidthM:0,loadedLengthM:6,areaBasis:"sloped-surface"}), /عرض بارگیر/);
  assert.throws(() => helper({tributaryWidthM:1,loadedLengthM:6}), /مبنای سطح مؤثر/);
});

test("C&C effective-area helper preserves projected versus sloped-surface basis", () => {
  const helper = globalThis.SteelLoadTransfer.calculateRectangularEffectiveWindArea;
  const projected = helper({component:"wall-girt",tributaryWidthM:2,loadedLengthM:3,areaBasis:"projected"});
  const sloped = helper({component:"roof-purlin",tributaryWidthM:2,loadedLengthM:3,areaBasis:"sloped-surface"});
  assert.equal(projected.effectiveAreaM2, 6);
  assert.equal(sloped.effectiveAreaM2, 6);
  assert.notEqual(projected.areaBasis, sloped.areaBasis);
});


test("polygonal C&C tributary patch returns concave polygon area and centroid", () => {
  const result = globalThis.SteelLoadTransfer.calculatePolygonEffectiveWindArea({
    component:"irregular-cladding-patch",
    vertices:[{x:0,y:0},{x:4,y:0},{x:4,y:1},{x:1,y:1},{x:1,y:4},{x:0,y:4}],
    areaBasis:"projected",
    zoneId:"user-supplied-unverified-zone"
  });
  assert.equal(result.effectiveAreaM2, 7);
  assert.ok(Math.abs(result.centroid.x - 1.3571428571428572) < 1e-12);
  assert.ok(Math.abs(result.centroid.y - 1.3571428571428572) < 1e-12);
  assert.equal(result.zoneId, "user-supplied-unverified-zone");
  assert.equal(result.pressureReady, false);
  assert.equal(result.verificationStatus, "geometry-only-not-code-verified");
});

test("polygonal C&C tributary patch rejects self-intersection and degenerate polygons", () => {
  const helper = globalThis.SteelLoadTransfer.calculatePolygonEffectiveWindArea;
  assert.throws(() => helper({
    vertices:[{x:0,y:0},{x:2,y:2},{x:0,y:2},{x:2,y:0}],
    areaBasis:"projected"
  }), /خودمتقاطع|مساحت|روی هم افتاده/);
  assert.throws(() => helper({
    vertices:[{x:0,y:0},{x:1,y:0},{x:2,y:0}],
    areaBasis:"projected"
  }), /مساحت|روی هم افتاده|برگشتی/);
});

test("polygonal C&C tributary patch rejects adjacent-edge backtracking overlap", () => {
  const helper = globalThis.SteelLoadTransfer.calculatePolygonEffectiveWindArea;
  assert.throws(() => helper({
    vertices:[{x:0,y:0},{x:2,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],
    areaBasis:"projected"
  }), /روی هم افتاده|برگشتی|خودمتقاطع/);
});

test("polygonal C&C centroid is invariant under reversed vertex winding", () => {
  const helper = globalThis.SteelLoadTransfer.calculatePolygonEffectiveWindArea;
  const vertices=[{x:0,y:0},{x:4,y:0},{x:4,y:2},{x:0,y:2}];
  const forward=helper({vertices,areaBasis:"projected"});
  const reverse=helper({vertices:vertices.slice().reverse(),areaBasis:"projected"});
  assert.equal(forward.effectiveAreaM2,8);
  assert.equal(reverse.effectiveAreaM2,8);
  assert.ok(Math.abs(forward.centroid.x-reverse.centroid.x)<1e-12);
  assert.ok(Math.abs(forward.centroid.y-reverse.centroid.y)<1e-12);
});

test("C&C polygon-zone overlap supports concave footprint and returns exact overlap area", () => {
  const result = globalThis.SteelLoadTransfer.calculatePolygonWindZoneOverlap({
    component:"roof-purlin-footprint",
    zoneId:"illustrative-zone-not-code-verified",
    areaBasis:"projected",
    footprintVertices:[{x:0,y:0},{x:3,y:0},{x:3,y:1},{x:1,y:1},{x:1,y:3},{x:0,y:3}],
    zoneVertices:[{x:0.5,y:0.5},{x:2,y:0.5},{x:2,y:2},{x:0.5,y:2}]
  });
  assert.equal(result.footprintAreaM2,5);
  assert.equal(result.zoneAreaM2,2.25);
  assert.ok(Math.abs(result.overlapAreaM2-1.25)<1e-10);
  assert.ok(Math.abs(result.footprintOverlapRatio-0.25)<1e-10);
  assert.equal(result.pressureReady,false);
  assert.equal(result.coefficientSource,null);
});

test("C&C polygon-zone overlap returns zero for disjoint regions and rejects mismatched area bases", () => {
  const helper=globalThis.SteelLoadTransfer.calculatePolygonWindZoneOverlap;
  const base={
    areaBasis:"sloped-surface",
    footprintVertices:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}],
    zoneVertices:[{x:3,y:3},{x:4,y:3},{x:4,y:4},{x:3,y:4}]
  };
  assert.equal(helper(base).overlapAreaM2,0);
  assert.throws(()=>helper({...base,areaBasis:"projected",zoneAreaBasis:"sloped-surface"}),/مبنای سطح/);
});

test("wind-zone coverage audit accepts a complete non-overlapping partition", () => {
  const audit=globalThis.SteelLoadTransfer.auditPolygonWindZoneCoverage({
    areaBasis:"projected",
    footprintVertices:[{x:0,y:0},{x:4,y:0},{x:4,y:2},{x:0,y:2}],
    zones:[
      {id:"left",vertices:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]},
      {id:"right",vertices:[{x:2,y:0},{x:4,y:0},{x:4,y:2},{x:2,y:2}]}
    ]
  });
  assert.equal(audit.coverageStatus,"covered-without-overlap");
  assert.equal(audit.geometricPartitionValid,true);
  assert.equal(audit.uncoveredFootprintAreaM2,0);
  assert.equal(audit.pairwiseOverlapAreaM2,0);
  assert.equal(audit.pressureReady,false);
});

test("wind-zone coverage audit rejects zone geometry outside member footprint", () => {
  const result=globalThis.SteelLoadTransfer.auditPolygonWindZoneCoverage({
    areaBasis:"projected",
    footprintVertices:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}],
    zones:[{id:"inside",vertices:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]},
      {id:"outside",vertices:[{x:3,y:0},{x:4,y:0},{x:4,y:1},{x:3,y:1}]}]
  });
  assert.equal(result.coverageStatus,"incomplete-or-outside");
  assert.equal(result.geometricPartitionValid,false);
  assert.equal(result.zonesOutsideFootprintAreaM2,1);
});

test("wind-zone coverage audit identifies gaps and overlapping zones", () => {
  const helper=globalThis.SteelLoadTransfer.auditPolygonWindZoneCoverage;
  const footprint=[{x:0,y:0},{x:4,y:0},{x:4,y:2},{x:0,y:2}];
  const gap=helper({areaBasis:"projected",footprintVertices:footprint,zones:[
    {id:"left",vertices:[{x:0,y:0},{x:1.5,y:0},{x:1.5,y:2},{x:0,y:2}]},
    {id:"right",vertices:[{x:2.5,y:0},{x:4,y:0},{x:4,y:2},{x:2.5,y:2}]}
  ]});
  assert.equal(gap.coverageStatus,"incomplete-or-outside");
  assert.ok(Math.abs(gap.uncoveredFootprintAreaM2-2)<1e-10);
  const overlap=helper({areaBasis:"projected",footprintVertices:footprint,zones:[
    {id:"a",vertices:[{x:0,y:0},{x:2.5,y:0},{x:2.5,y:2},{x:0,y:2}]},
    {id:"b",vertices:[{x:1.5,y:0},{x:4,y:0},{x:4,y:2},{x:1.5,y:2}]}
  ]});
  assert.equal(overlap.coverageStatus,"overlapping-zones");
  assert.equal(overlap.geometricPartitionValid,false);
  assert.equal(overlap.uncoveredFootprintAreaM2,null);
});

test("wind-zone overlaps outside the member footprint do not count as member overlap", () => {
  const footprint=[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}];
  const zoneA=[{x:0,y:0},{x:1,y:0},{x:1,y:2},{x:2,y:3},{x:0,y:3}];
  const zoneB=[{x:1,y:0},{x:2,y:0},{x:2,y:2},{x:2,y:3},{x:0,y:3},{x:1,y:2}];
  const result=globalThis.SteelLoadTransfer.auditPolygonWindZoneCoverage({
    areaBasis:"projected",footprintVertices:footprint,
    zones:[{id:"A",vertices:zoneA},{id:"B",vertices:zoneB}]
  });
  assert.equal(result.pairwiseOverlapAreaM2,0);
  assert.equal(result.overlappingZonePairs,0);
  assert.equal(result.summedOverlapAreaM2,4);
  assert.equal(result.uncoveredFootprintAreaM2,0);
  assert.equal(result.pressureReady,false);
});

test("member tributary footprint uses actual 3D endpoints and explicit perpendicular width vector", () => {
  const helper=globalThis.SteelLoadTransfer.buildMemberTributaryFootprint;
  const result=helper({
    memberId:"PURLIN-1",
    start:{x:0,y:3,z:0},end:{x:4,y:5,z:0},
    tributaryWidthVector:{x:-1,y:2,z:0},
    areaBasis:"sloped-surface"
  });
  assert.ok(Math.abs(result.memberLengthM-Math.sqrt(20))<1e-10);
  assert.ok(Math.abs(result.tributaryWidthM-Math.sqrt(5))<1e-10);
  assert.ok(Math.abs(result.footprintAreaM2-Math.sqrt(100))<1e-10);
  assert.equal(result.vertices.length,4);
  assert.equal(result.pressureReady,false);
  assert.throws(()=>helper({
    start:{x:0,y:0,z:0},end:{x:2,y:0,z:0},
    tributaryWidthVector:{x:1,y:1,z:0},areaBasis:"projected"
  }),/عمود/);
  assert.throws(()=>helper({
    start:{x:0,y:0,z:0},end:{x:0,y:0,z:0},
    tributaryWidthVector:{x:0,y:1,z:0},areaBasis:"projected"
  }),/مثبت/);
  assert.throws(()=>helper({
    start:{x:0,y:0,z:0},end:{x:2,y:0,z:0},
    tributaryWidthVector:{x:0,y:1,z:0}
  }),/مبنای footprint/);
});

test("model-generated roof purlin footprints use clipped station strips and split ridge faces", () => {
  const fs=require("node:fs");
  const source=fs.readFileSync(require("node:path").join(__dirname,"../js/model-3d.js"),"utf8");
  const start=source.indexOf("function buildRoofPurlinWindFootprints(sourceModel)");
  assert.ok(start>=0,"roof footprint builder must exist in model-3d.js");
  const open=source.indexOf("{",start);let depth=0,end=-1;
  for(let i=open;i<source.length;i++){if(source[i]==="{")depth++;else if(source[i]==="}"){depth--;if(depth===0){end=i+1;break;}}}
  assert.ok(end>open,"roof footprint builder must have a complete body");
  const build=new Function("return ("+source.slice(start,end)+")")();
  const model={
    geometry:{roofRows:2,roofStationSpacing:1,totalRoofSlope:2,span:4,height:3,rise:0,roofOverhang:0},
    nodes:[
      {id:"L0",x:0,y:0,z:0},{id:"L1",x:0,y:0,z:3},
      {id:"R0",x:4,y:0,z:0},{id:"R1",x:4,y:0,z:3},
      {id:"T0",x:2,y:1,z:0},{id:"T1",x:2,y:1,z:3}
    ],
    members:[
      {id:"LEFT-EAVE",sectionKey:"roofPurlin",start:"L0",end:"L1",side:"left",row:1,rowLeft:1,tributaryWidth:1},
      {id:"RIDGE",sectionKey:"roofPurlin",start:"T0",end:"T1",side:"ridge",rowLeft:3,rowRight:1,tributaryWidthLeft:1,tributaryWidthRight:1},
      {id:"RIGHT-EAVE",sectionKey:"roofPurlin",start:"R0",end:"R1",side:"right",row:3,rowRight:3,tributaryWidth:1}
    ]
  };
  const result=build(model);
  assert.equal(result.length,4);
  assert.deepEqual(result.map(x=>x.face),["left","left","right","right"]);
  assert.ok(result.every(x=>x.areaBasis==="sloped-surface"&&x.pressureReady===false));
  assert.ok(result.every(x=>Math.abs(x.areaM2-1.5)<1e-10));
  assert.deepEqual(result[0].vertices,[{x:0,y:0},{x:0.5,y:0},{x:0.5,y:3},{x:0,y:3}]);
  assert.deepEqual(result[1].vertices,[{x:1.5,y:0},{x:2,y:0},{x:2,y:3},{x:1.5,y:3}]);
  const globalRidge=result[1].globalVertices.find(p=>Math.abs(p.z)<1e-9&&Math.abs(p.y-3)<1e-9&&Math.abs(p.x-2)<1e-9);
  assert.ok(globalRidge,"left-face ridge point must map into global XYZ");
  assert.ok(Math.abs(globalRidge.x-2)<1e-9);
  assert.ok(result.every(x=>x.globalVertices.length===4));
});

test("sloped gable roof footprint maps its ridge point to the global apex", () => {
  const fs=require("node:fs"),path=require("node:path");
  const source=fs.readFileSync(path.join(__dirname,"../js/model-3d.js"),"utf8");
  const start=source.indexOf("function buildRoofPurlinWindFootprints(sourceModel)");
  const open=source.indexOf("{",start);let depth=0,end=-1;
  for(let i=open;i<source.length;i++){if(source[i]==="{")depth++;else if(source[i]==="}"){depth--;if(depth===0){end=i+1;break;}}}
  const build=new Function("return ("+source.slice(start,end)+")")();
  const halfSlope=Math.hypot(2,1),overhang=0.8,total=halfSlope+overhang;
  const result=build({
    geometry:{roofRows:1,roofStationSpacing:total,totalRoofSlope:total,span:4,height:3,rise:1,roofOverhang:overhang},
    nodes:[{id:"A",x:2,y:4,z:0},{id:"B",x:2,y:4,z:2}],
    members:[{id:"RIDGE",sectionKey:"roofPurlin",start:"A",end:"B",side:"left",row:2,rowLeft:2,tributaryWidth:total/2}]
  });
  const apex=result[0].globalVertices.find(p=>Math.abs(p.z)<1e-9&&Math.abs(p.x-2)<1e-9);
  assert.ok(apex,"roof ridge coordinate must be present");
  assert.ok(Math.abs(apex.y-4)<1e-9);
  assert.ok(Math.abs(result[0].areaM2-(total/2)*2)<1e-9);
});

test("model-generated roof purlin footprints reject missing member endpoints", () => {
  const fs=require("node:fs");
  const source=fs.readFileSync(require("node:path").join(__dirname,"../js/model-3d.js"),"utf8");
  const start=source.indexOf("function buildRoofPurlinWindFootprints(sourceModel)");
  const open=source.indexOf("{",start);let depth=0,end=-1;
  for(let i=open;i<source.length;i++){if(source[i]==="{")depth++;else if(source[i]==="}"){depth--;if(depth===0){end=i+1;break;}}}
  const build=new Function("return ("+source.slice(start,end)+")")();
  assert.throws(()=>build({geometry:{roofRows:1,roofStationSpacing:2,totalRoofSlope:2},nodes:[],members:[
    {id:"BAD",sectionKey:"roofPurlin",start:"MISSING",end:"ALSO-MISSING",side:"left",row:1,tributaryWidth:1}
  ]}),/گره عضو پرلین/);
});

test("polygonal C&C tributary patch requires finite coordinates and explicit area basis", () => {
  const helper = globalThis.SteelLoadTransfer.calculatePolygonEffectiveWindArea;
  assert.throws(() => helper({
    vertices:[{x:0,y:0},{x:1,y:0},{x:NaN,y:1}],
    areaBasis:"projected"
  }), /مختصات/);
  assert.throws(() => helper({
    vertices:[{x:0,y:0},{x:1,y:0},{x:0,y:1}]
  }), /مبنای سطح/);
});


function extractModelLoadAssignment() {
  const fs=require("node:fs"),path=require("node:path");
  const source=fs.readFileSync(path.join(__dirname,"../js/model-3d.js"),"utf8");
  const start=source.indexOf("function assignGeometricMemberLineLoads(");
  assert.ok(start>=0,"model load assignment helper must exist");
  const open=source.indexOf("{",start);let depth=0,end=-1;
  for(let i=open;i<source.length;i++){
    if(source[i]==="{")depth++;
    else if(source[i]==="}"){depth--;if(depth===0){end=i+1;break;}}
  }
  assert.ok(end>open,"model load assignment helper must have a complete body");
  return new Function("SteelLoadTransfer","return ("+source.slice(start,end)+")")(globalThis.SteelLoadTransfer);
}

test("geometric load assignment sends roof D/L/S to purlins once and combines both ridge tributaries",()=>{
  const assign=extractModelLoadAssignment(),angle=Math.atan2(2,6),c=Math.cos(angle);
  const members=[
    {id:"RAFTER-L",axis:"transverse",frame:1,type:"رفتر چپ"},
    {id:"RAFTER-R",axis:"transverse",frame:1,type:"رفتر راست"},
    {id:"PURLIN-L",sectionKey:"roofPurlin",side:"left",tributaryWidth:2},
    {id:"PURLIN-R",sectionKey:"roofPurlin",side:"right",tributaryWidth:3},
    {id:"PURLIN-RIDGE",sectionKey:"roofPurlin",side:"ridge",tributaryWidth:5,tributaryWidthLeft:2,tributaryWidthRight:3}
  ];
  const loads={
    deadLeft:2,deadRight:3,liveLeft:1,liveRight:1.5,snowLeft:0.8,snowRight:1.2,
    windLeft:0.5,windRight:-0.25,
    deadAreaBasis:"horizontal-projection",liveAreaBasis:"sloped-surface",snowAreaBasis:"horizontal-projection"
  };
  const result=assign(members,{span:12,rise:2},[6],loads);
  assert.equal(result.roofPurlinsPresent,true);
  assert.equal(members[0].lineLoads.dead,0);
  assert.equal(members[1].lineLoads.live,0);
  assert.equal(members[0].lineLoads.roofLoadPath,"roof-purlins");
  assert.ok(Math.abs(members[2].lineLoads.dead-2*2*c)<1e-10);
  assert.ok(Math.abs(members[3].lineLoads.dead-3*3*c)<1e-10);
  assert.ok(Math.abs(members[4].lineLoads.dead-(2*2*c+3*3*c))<1e-10);
  assert.ok(Math.abs(members[4].lineLoads.live-(1*2+1.5*3))<1e-10);
  assert.ok(Math.abs(members[4].lineLoads.snow-(0.8*2*c+1.2*3*c))<1e-10);
  assert.ok(Math.abs(members[4].lineLoads.wind-(0.5*2-0.25*3))<1e-10);
  assert.equal(members[4].lineLoads.tributaryWidthLeft,2);
  assert.equal(members[4].lineLoads.tributaryWidthRight,3);
});

test("geometric load assignment falls back to rafters only without purlins and routes wall wind to correct girts",()=>{
  const assign=extractModelLoadAssignment();
  const members=[
    {id:"RAFTER-L",axis:"transverse",frame:1,type:"رفتر چپ"},
    {id:"RAFTER-R",axis:"transverse",frame:1,type:"رفتر راست"},
    {id:"WALL-L",sectionKey:"wallGirt",tributaryHeight:1.5,side:"left"},
    {id:"END-F",sectionKey:"endGirt",tributaryHeight:2,endFace:"front"},
    {id:"END-B",sectionKey:"endGirt",tributaryHeight:2,endFace:"back"}
  ];
  const loads={deadLeft:2,deadRight:3,liveLeft:1,liveRight:1.5,snowLeft:0.8,snowRight:1.2,
    windWall:0.4,windEndFront:0.6,windEndBack:-0.3,
    deadAreaBasis:"sloped-surface",liveAreaBasis:"horizontal-projection",snowAreaBasis:"sloped-surface"};
  const result=assign(members,{span:12,rise:2},[6],loads);
  assert.equal(result.roofPurlinsPresent,false);
  assert.equal(members[0].lineLoads.roofLoadPath,"direct-rafter");
  assert.ok(members[0].lineLoads.dead>0);
  assert.ok(members[1].lineLoads.live>0);
  assert.ok(Math.abs(members[2].lineLoads.wind-0.6)<1e-12);
  assert.ok(Math.abs(members[3].lineLoads.windEnd-1.2)<1e-12);
  assert.ok(Math.abs(members[4].lineLoads.windEnd+0.6)<1e-12);
  assert.throws(()=>assign([{id:"BAD",axis:"transverse",frame:1,type:"رفتر چپ"}],{span:12,rise:2},[0],loads),/عرض بارگیر قاب/);
});


test("integrated assigned purlin line load closes global force and moment against cantilever reactions",()=>{
  const assign=extractModelLoadAssignment();
  const member={id:"PURLIN-CANTILEVER",sectionKey:"roofPurlin",side:"left",tributaryWidth:1.5};
  assign([member],{span:12,rise:2},[2],{
    deadLeft:2,deadRight:0,liveLeft:0,snowLeft:0,
    deadAreaBasis:"sloped-surface",liveAreaBasis:"sloped-surface",snowAreaBasis:"sloped-surface"
  });
  const q=member.lineLoads.dead*1000;
  member.analysisLoad={uniformLocal:[0,-q,0]};
  const result=solver.analyze({
    nodes:[{id:"FIX",x:0,y:0,z:0},{id:"TIP",x:2,y:0,z:0}],
    members:[member]
  },{
    sectionResolver:()=>section,
    supports:[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}]
  });
  assert.equal(result.equilibrium.ok,true);
  assert.ok(Math.abs(result.equilibrium.appliedForceN[1]+q*2)<1e-6);
  assert.ok(Math.abs(result.equilibrium.supportReactionN[1]-q*2)<1e-6);
  assert.ok(Math.abs(result.equilibrium.appliedMomentNm[2]+q*2)<1e-6);
  assert.ok(Math.abs(result.equilibrium.supportMomentNm[2]-q*2)<1e-6);
  assert.ok(Math.hypot(...result.equilibrium.forceResidualN)<1e-6);
  assert.ok(Math.hypot(...result.equilibrium.momentResidualNm)<1e-6);
});
