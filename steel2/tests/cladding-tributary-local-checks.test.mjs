import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../cladding-tributary-local-checks.js", import.meta.url), "utf8");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const {
  rectangularPanelTributaryShares,
  checkOneWayCladdingStrip,
  checkCladdingFastener,
} = await import(moduleUrl);

test("four-edge panel tributary regions sum to panel area", () => {
  const r = rectangularPanelTributaryShares({
    width_m: 6, height_m: 4,
    supports: [
      { id: "L", edge: "left", start_m: 0, end_m: 4 },
      { id: "R", edge: "right", start_m: 0, end_m: 4 },
      { id: "B", edge: "bottom", start_m: 0, end_m: 6 },
      { id: "T", edge: "top", start_m: 0, end_m: 6 },
    ],
  });
  assert.equal(r.status, "geometric_tributary_area_only");
  assert.ok(Math.abs(r.total_area_m2 - 24) < 1e-8);
  assert.ok(Math.abs(r.shares.reduce((s, x) => s + x.share_of_panel, 0) - 1) < 1e-8);
});

test("two opposing supports split the panel into equal tributary areas", () => {
  const r = rectangularPanelTributaryShares({
    width_m: 8, height_m: 3,
    supports: [
      { id: "L", edge: "left", start_m: 0, end_m: 3 },
      { id: "R", edge: "right", start_m: 0, end_m: 3 },
    ],
  });
  assert.equal(r.status, "geometric_tributary_area_only");
  assert.ok(Math.abs(r.shares[0].tributary_area_m2 - 12) < 1e-8);
  assert.ok(Math.abs(r.shares[1].tributary_area_m2 - 12) < 1e-8);
});

test("same-edge supports are split by centre Voronoi intervals", () => {
  const r = rectangularPanelTributaryShares({
    width_m: 6, height_m: 2,
    supports: [
      { id: "B1", edge: "bottom", start_m: 0, end_m: 3 },
      { id: "B2", edge: "bottom", start_m: 3, end_m: 6 },
      { id: "T", edge: "top", start_m: 0, end_m: 6 },
    ],
  });
  assert.equal(r.status, "geometric_tributary_area_only");
  assert.ok(Math.abs(r.total_area_m2 - 12) < 1e-8);
});

test("one-way strip computes expected simple-span demands", () => {
  const r = checkOneWayCladdingStrip({
    span_m: 4, net_pressure_kpa: 1, E_kpa: 20000000,
    I_m4_per_m: 1e-5, allowable_deflection_m: 0.02,
    moment_resistance_kNm_per_m: 3, shear_resistance_kN_per_m: 3,
  });
  assert.equal(r.demands.moment_kNm_per_m, 2);
  assert.equal(r.demands.shear_kN_per_m, 2);
  assert.ok(r.demands.deflection_m > 0);
});

test("fastener check calculates signed-pressure magnitude demand", () => {
  const r = checkCladdingFastener({
    net_pressure_kpa: -1.2, tributary_area_per_fastener_m2: 0.25,
    tension_resistance_kN: 0.5, shear_resistance_kN: 0.4, shear_demand_kN: 0.1,
  });
  assert.equal(r.demands.tension_kN, 0.3);
  assert.equal(r.status, "passes_supplied_limits_only");
});

test("invalid support geometry is blocked", () => {
  const r = rectangularPanelTributaryShares({
    width_m: 5, height_m: 3,
    supports: [{ id: "X", edge: "left", start_m: 0, end_m: 4 }],
  });
  assert.equal(r.status, "blocked");
});
