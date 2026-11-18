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
    basicWindKmh: 360,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1
    },
    zones: { "roof-left": 0.8, "roof-right": "" }
  };
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures(input);
  assert.equal(result.ready, false);
  assert.equal(result.rows["roof-left"], null);
  assert.equal(result.rows["roof-right"], null);
});

test("wind-zone pressure helper rejects negative wind speed without producing pressures", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    basicWindKmh: -10,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: 0.2
    },
    zones: { "roof-left": 0.8 }
  });
  assert.equal(result.ready, false);
  assert.equal(result.q, null);
});


test("wind-zone pressure helper rejects negative amplification factors", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    basicWindKmh: 360,
    coefficients: {
      importance: 1, exposure: -1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: 0.2
    },
    zones: { "roof-left": 0.8 }
  });
  assert.equal(result.ready, false);
  assert.equal(result.rows["roof-left"], null);
});

test("wind-zone pressure helper preserves signed internal pressure while validating factors", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    basicWindKmh: 360,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: -0.2
    },
    zones: { "roof-left": 0.8 }
  });
  assert.equal(result.ready, true);
  assert.ok(Math.abs(result.rows["roof-left"].netInternalPositive - 3.678) < 1e-12);
  assert.ok(Math.abs(result.rows["roof-left"].netInternalNegative - 6.13) < 1e-12);
});

test("wind-zone pressure helper accepts zero basic wind as zero pressure", () => {
  const result = globalThis.SteelLoadTransfer.calculateWindZonePressures({
    basicWindKmh: 0,
    coefficients: {
      importance: 1, exposure: 1, topography: 1, gust: 1,
      directionality: 1, internalGust: 1, internalPressure: 0.2
    },
    zones: { "roof-left": 0.8 }
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



test("six-zone pressure mapping transfers signed pressures to roof, side-wall and end-wall members",()=>{
  const p=globalThis.SteelLoadTransfer.calculateWindZonePressures({basicWindKmh:360,coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}});
  const model={members:[
    {id:"PL",sectionKey:"roofPurlin",side:"left",tributaryWidth:2},{id:"PR",sectionKey:"roofPurlin",side:"right",tributaryWidth:3},
    {id:"PG",sectionKey:"roofPurlin",side:"ridge",tributaryWidth:4,tributaryWidthLeft:1.5,tributaryWidthRight:2.5},
    {id:"WL",sectionKey:"wallGirt",side:"left",tributaryHeight:1.2},{id:"WR",sectionKey:"wallGirt",side:"right",tributaryHeight:1.2},
    {id:"EF",sectionKey:"endGirt",endFace:"front",tributaryHeight:1.5},{id:"ER",sectionKey:"endGirt",endFace:"rear",tributaryHeight:1.5}]};
  const m=globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers(model,p,"positive");
  assert.ok(Math.abs(m.memberLoads.PL.windLeft-3.678*2)<1e-12);
  assert.ok(Math.abs(m.memberLoads.PR.windRight-(-4.291)*3)<1e-12);
  assert.ok(Math.abs(m.memberLoads.PG.windLeft-3.678*1.5)<1e-12);
  assert.ok(Math.abs(m.memberLoads.PG.windRight-(-1.839)*2.5)<1e-12);
  assert.ok(Math.abs(m.memberLoads.WL.wind-3.065*1.2)<1e-12);
  assert.ok(Math.abs(m.memberLoads.WR.wind-(-4.904)*1.2)<1e-12);
  assert.ok(Math.abs(m.memberLoads.EF.windEnd-4.291*1.5)<1e-12);
  assert.ok(Math.abs(m.memberLoads.ER.windEnd-(-3.678)*1.5)<1e-12);
  assert.equal(m.counts.roofPurlins,3);assert.equal(m.endFacePressures.front,4.291);
});

test("six-zone pressure mapping fails closed for incomplete data, bad scenario or missing member groups",()=>{
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({},null,"positive"),/فشارهای شش‌ناحیه‌ای/);
  const p=globalThis.SteelLoadTransfer.calculateWindZonePressures({basicWindKmh:360,coefficients:{importance:1,exposure:1,topography:1,gust:1,directionality:1,internalGust:1,internalPressure:0.2},zones:{"roof-left":0.8,"roof-right":-0.5,"long-wall-left":0.7,"long-wall-right":-0.6,"end-wall-front":0.9,"end-wall-back":-0.4}});
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({members:[]},p,"unspecified"),/positive یا negative/);
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({members:[{id:"x",sectionKey:"roofPurlin",side:"left",tributaryWidth:-1}]},p,"positive"),/عرض بارگیر/);
  assert.throws(()=>globalThis.SteelLoadTransfer.mapWindZonePressuresToMembers({members:[{id:"x",sectionKey:"roofPurlin",side:"left",tributaryWidth:1}]},p,"positive"),/نیازمند پرلین/);
});
