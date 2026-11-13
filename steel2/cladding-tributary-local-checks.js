/**
 * SAHROUD STEEL — preliminary cladding tributary geometry and local checks.
 *
 * This module adds:
 * 1) nearest-supported-edge tributary areas for axis-aligned rectangular panels;
 * 2) one-way simply-supported strip demand checks using user-supplied section data;
 * 3) fastener demand checks using user-supplied resistance and tributary area.
 *
 * It does NOT solve plate/shell/membrane stiffness, two-way action, nonlinear
 * contact, masonry cracking, panel composite action, plastic-film prestress,
 * code wind pressures, or global frame/foundation response.
 *
 * Units: m, m², kN/m² (kPa), kN, kN·m, kN/m² for E.
 */

const EDGES = ["left", "right", "bottom", "top"];
const finite = Number.isFinite;
const positive = (v) => finite(v) && v > 0;
const EPS = 1e-10;

function clipPolygon(poly, a, b, c) {
  const out = [];
  if (!poly.length) return out;
  const value = ([x, y]) => a * x + b * y + c;
  for (let i = 0; i < poly.length; i++) {
    const current = poly[i];
    const next = poly[(i + 1) % poly.length];
    const vc = value(current);
    const vn = value(next);
    const inC = vc <= EPS;
    const inN = vn <= EPS;
    if (inC && inN) {
      out.push(next);
    } else if (inC && !inN) {
      const t = vc / (vc - vn);
      out.push([current[0] + t * (next[0] - current[0]), current[1] + t * (next[1] - current[1])]);
    } else if (!inC && inN) {
      const t = vc / (vc - vn);
      out.push([current[0] + t * (next[0] - current[0]), current[1] + t * (next[1] - current[1])]);
      out.push(next);
    }
  }
  return out;
}

function polygonArea(poly) {
  let twice = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    twice += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(twice) / 2;
}

const distanceForms = (w, h) => ({
  left: [1, 0, 0],
  right: [-1, 0, w],
  bottom: [0, 1, 0],
  top: [0, -1, h],
});

/**
 * Calculate geometric nearest-edge tributary regions for a rectangular panel.
 * Supports are line supports on one or more full panel edges. Multiple support
 * members on one edge are partitioned by the midpoint between member centres.
 *
 * This is a transparent tributary-area convention, NOT a plate stiffness solve.
 */
export function rectangularPanelTributaryShares({ width_m, height_m, supports }) {
  const errors = [];
  if (!positive(width_m)) errors.push("width_m must be > 0");
  if (!positive(height_m)) errors.push("height_m must be > 0");
  if (!Array.isArray(supports) || supports.length === 0) errors.push("supports must be a non-empty array");
  if (errors.length) return { status: "blocked", shares: [], total_area_m2: 0, error_m2: 0, errors };

  supports.forEach((s, i) => {
    if (!s || !s.id) errors.push(`supports[${i}].id is required`);
    if (!s || !EDGES.includes(s.edge)) errors.push(`supports[${i}].edge must be left/right/bottom/top`);
    const limit = s && (s.edge === "left" || s.edge === "right" ? height_m : width_m);
    if (!s || !positive(s.start_m) && s.start_m !== 0) errors.push(`supports[${i}].start_m must be >= 0`);
    if (!s || !positive(s.end_m)) errors.push(`supports[${i}].end_m must be > 0`);
    if (s && finite(s.start_m) && finite(s.end_m) && (s.start_m < 0 || s.end_m > limit || s.end_m <= s.start_m)) {
      errors.push(`supports[${i}] interval must lie within its panel edge`);
    }
  });
  if (errors.length) return { status: "blocked", shares: [], total_area_m2: 0, error_m2: 0, errors };

  const activeEdges = [...new Set(supports.map(s => s.edge))];
  const forms = distanceForms(width_m, height_m);
  const rect = [[0, 0], [width_m, 0], [width_m, height_m], [0, height_m]];
  const edgeAreas = new Map();

  for (const edge of activeEdges) {
    let region = rect;
    const [a, b, c] = forms[edge];
    for (const other of activeEdges) {
      if (other === edge) continue;
      const [oa, ob, oc] = forms[other];
      region = clipPolygon(region, a - oa, b - ob, c - oc);
    }
    edgeAreas.set(edge, polygonArea(region));
  }

  const shares = [];
  for (const edge of activeEdges) {
    const members = supports.filter(s => s.edge === edge).slice().sort((a, b) => (a.start_m + a.end_m) - (b.start_m + b.end_m));
    const centers = members.map(s => (s.start_m + s.end_m) / 2);
    const edgeLength = edge === "left" || edge === "right" ? height_m : width_m;
    const boundaries = centers.map((center, i) => i === 0 ? 0 : (centers[i - 1] + center) / 2);
    boundaries.push(edgeLength);
    const totalEdgeArea = edgeAreas.get(edge) || 0;
    const intervalWidths = members.map((_, i) => Math.max(0, boundaries[i + 1] - boundaries[i]));
    const widthSum = intervalWidths.reduce((s, v) => s + v, 0);
    members.forEach((member, i) => {
      const area = widthSum > 0 ? totalEdgeArea * intervalWidths[i] / widthSum : 0;
      if (area > EPS) shares.push({
        receiving_element_id: member.id,
        edge,
        tributary_area_m2: area,
        share_of_panel: area / (width_m * height_m),
        convention: "nearest_supported_edge_then_member_center_voronoi",
      });
    });
  }

  const total = shares.reduce((s, item) => s + item.tributary_area_m2, 0);
  const panelArea = width_m * height_m;
  const error = total - panelArea;
  return {
    status: Math.abs(error) <= 1e-7 * Math.max(1, panelArea) ? "geometric_tributary_area_only" : "blocked",
    shares,
    total_area_m2: total,
    panel_area_m2: panelArea,
    error_m2: error,
    errors: Math.abs(error) <= 1e-7 * Math.max(1, panelArea) ? [] : ["Tributary regions do not cover the full panel area"],
    limitations: [
      "Nearest-edge tributary areas are an explicit load-allocation convention, not a plate/shell stiffness solution.",
      "Supports are assumed to run along full panel edges; partial-edge support geometry is not solved.",
      "No diaphragm or in-plane shear transfer is calculated.",
    ],
  };
}

/**
 * One-way, simply-supported, unit-width strip under uniform pressure.
 * E_kpa and I_m4_per_m must describe the actual effective strip section.
 */
export function checkOneWayCladdingStrip(input) {
  const errors = [];
  if (!positive(input?.span_m)) errors.push("span_m must be > 0");
  if (!finite(input?.net_pressure_kpa)) errors.push("net_pressure_kpa must be finite");
  if (!positive(input?.E_kpa)) errors.push("E_kpa must be > 0");
  if (!positive(input?.I_m4_per_m)) errors.push("I_m4_per_m must be > 0");
  if (!positive(input?.allowable_deflection_m)) errors.push("allowable_deflection_m must be > 0");
  if (!positive(input?.moment_resistance_kNm_per_m)) errors.push("moment_resistance_kNm_per_m must be > 0");
  if (!positive(input?.shear_resistance_kN_per_m)) errors.push("shear_resistance_kN_per_m must be > 0");
  if (errors.length) return { status: "blocked", errors };

  const p = Math.abs(input.net_pressure_kpa); // kN/m²; unit strip gives kN/m
  const L = input.span_m;
  const w = p; // kN/m for a 1 m wide strip
  const moment = w * L * L / 8;
  const shear = w * L / 2;
  const deflection = 5 * w * Math.pow(L, 4) / (384 * input.E_kpa * input.I_m4_per_m);
  const ratios = {
    moment: moment / input.moment_resistance_kNm_per_m,
    shear: shear / input.shear_resistance_kN_per_m,
    deflection: deflection / input.allowable_deflection_m,
  };
  return {
    status: Math.max(...Object.values(ratios)) <= 1 ? "passes_supplied_limits_only" : "fails_supplied_limits",
    demands: { moment_kNm_per_m: moment, shear_kN_per_m: shear, deflection_m: deflection },
    ratios,
    sign_note: input.net_pressure_kpa < 0 ? "suction; magnitude checked, load direction must be retained in global model" : "inward pressure; magnitude checked",
    assumptions: ["Simply supported", "One-way action", "Uniform pressure", "Linear elastic response", "Unit strip width"],
    limitations: [
      "User-supplied E, I and resistances are not independently validated.",
      "No local buckling, yielding, wrinkling, cracking, composite action, connection flexibility or nonlinear response.",
      "Not suitable for greenhouse film/membrane without a validated membrane model and prestress data.",
    ],
  };
}

/** Fastener tension/shear demand check using explicit tributary area. */
export function checkCladdingFastener(input) {
  const errors = [];
  if (!finite(input?.net_pressure_kpa)) errors.push("net_pressure_kpa must be finite");
  if (!positive(input?.tributary_area_per_fastener_m2)) errors.push("tributary_area_per_fastener_m2 must be > 0");
  if (!positive(input?.tension_resistance_kN)) errors.push("tension_resistance_kN must be > 0");
  if (!positive(input?.shear_resistance_kN)) errors.push("shear_resistance_kN must be > 0");
  if (!finite(input?.shear_demand_kN) || input.shear_demand_kN < 0) errors.push("shear_demand_kN must be >= 0");
  if (errors.length) return { status: "blocked", errors };

  const tensionDemand = Math.abs(input.net_pressure_kpa) * input.tributary_area_per_fastener_m2;
  const tensionRatio = tensionDemand / input.tension_resistance_kN;
  const shearRatio = input.shear_demand_kN / input.shear_resistance_kN;
  return {
    status: Math.max(tensionRatio, shearRatio) <= 1 ? "passes_supplied_limits_only" : "fails_supplied_limits",
    demands: { tension_kN: tensionDemand, shear_kN: input.shear_demand_kN },
    ratios: { tension: tensionRatio, shear: shearRatio },
    limitations: [
      "Resistances must be design resistances for the actual substrate, fastener, edge distance and failure mode.",
      "No combined tension-shear interaction, pull-over, pull-out, bearing, fatigue, corrosion or group effects are checked.",
    ],
  };
}
