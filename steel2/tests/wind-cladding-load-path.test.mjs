import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Load the standalone ES module by data URL so this test does not require
// changing the host application's package/module configuration.
const source = await readFile(new URL("../wind-cladding-load-path.js", import.meta.url), "utf8");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const { mapCladdingWindLoads } = await import(moduleUrl);

const patch = (overrides = {}) => ({
  id: "wall-west-zone-1",
  material: "metal_sheet",
  area_m2: 10,
  net_pressure_kpa: 0.8,
  pressure_case_id: "WIND-X-PLUS",
  pressure_source: "upstream wind solver case W1",
  load_shares: [
    { receiving_element_id: "girt-1", path_type: "sheet-fasteners-to-girt", share: 0.6 },
    { receiving_element_id: "girt-2", path_type: "sheet-fasteners-to-girt", share: 0.4 },
  ],
  ...overrides,
});

test("conserves the 8 kN reference surface force", () => {
  const result = mapCladdingWindLoads({ patches: [patch()] });
  assert.equal(result.status, "mapped_equilibrium_only");
  assert.equal(result.total_surface_force_kN, 8);
  assert.equal(result.total_transferred_force_kN, 8);
  assert.ok(Math.abs(result.equilibrium_error_kN) < 1e-10);
  assert.deepEqual(result.loads.map(x => x.force_kN), [4.8, 3.2]);
});

test("preserves negative suction sign", () => {
  const result = mapCladdingWindLoads({ patches: [patch({ net_pressure_kpa: -0.5 })] });
  assert.equal(result.total_surface_force_kN, -5);
  assert.equal(result.total_transferred_force_kN, -5);
});

test("blocks non-conserving shares", () => {
  const result = mapCladdingWindLoads({ patches: [patch({ load_shares: [
    { receiving_element_id: "girt-1", path_type: "fasteners", share: 0.7 },
  ] })] });
  assert.equal(result.status, "blocked");
  assert.ok(result.errors.some(x => x.includes("must sum to 1")));
});

test("blocks missing receiving path", () => {
  const result = mapCladdingWindLoads({ patches: [patch({ load_shares: [null] })] });
  assert.equal(result.status, "blocked");
});

test("blocks missing pressure provenance", () => {
  const result = mapCladdingWindLoads({ patches: [patch({ pressure_source: "" })] });
  assert.equal(result.status, "blocked");
});
