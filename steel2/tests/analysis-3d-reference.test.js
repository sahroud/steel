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
