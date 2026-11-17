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
  assert.equal(globalThis.SteelLoadTransfer.surfacePressureToLineLoad(-0.8, 1.5), -1.2);
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
