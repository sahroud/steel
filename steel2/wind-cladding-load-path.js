/**
 * SAHROUD STEEL — cladding wind load-path mapper.
 *
 * Converts already-calculated net wind pressures on explicit surface patches
 * into auditable equivalent forces on explicitly declared receiving elements.
 * It does NOT calculate code wind pressure, cladding capacity, fasteners,
 * diaphragm action, frame analysis, base reactions, or foundation design.
 *
 * Units: area m², pressure kN/m² (kPa), force kN.
 */

const MATERIALS = new Set([
  "masonry",
  "metal_sheet",
  "sandwich_panel",
  "greenhouse_film",
  "polycarbonate",
  "custom",
]);

const finitePositive = (v) => Number.isFinite(v) && v > 0;
const finite = (v) => Number.isFinite(v);

function validatePatch(patch, index) {
  const errors = [];
  const prefix = `patches[${index}]`;
  if (!patch || typeof patch !== "object") return [`${prefix}: patch must be an object`];
  if (!patch.id) errors.push(`${prefix}.id is required`);
  if (!MATERIALS.has(patch.material)) errors.push(`${prefix}.material is unsupported`);
  if (!finitePositive(patch.area_m2)) errors.push(`${prefix}.area_m2 must be > 0`);
  if (!finite(patch.net_pressure_kpa)) errors.push(`${prefix}.net_pressure_kpa must be finite; positive = inward, negative = suction/outward`);
  if (!patch.pressure_case_id) errors.push(`${prefix}.pressure_case_id is required`);
  if (!patch.pressure_source) errors.push(`${prefix}.pressure_source is required`);
  if (!Array.isArray(patch.load_shares) || patch.load_shares.length === 0) {
    errors.push(`${prefix}.load_shares must explicitly identify receiving elements`);
  } else {
    let sum = 0;
    patch.load_shares.forEach((share, j) => {
      if (!share || !share.receiving_element_id) errors.push(`${prefix}.load_shares[${j}].receiving_element_id is required`);
      if (!finitePositive(share.share)) errors.push(`${prefix}.load_shares[${j}].share must be > 0`);
      else sum += share.share;
      if (!share.path_type) errors.push(`${prefix}.load_shares[${j}].path_type is required`);
    });
    if (Math.abs(sum - 1) > 1e-8) errors.push(`${prefix}.load_shares must sum to 1 (received ${sum})`);
  }
  return errors;
}

/**
 * @param {{patches: Array<object>, tolerance_kN?: number}} input
 * @returns {{status: string, loads: Array<object>, patches: Array<object>,
 *            total_surface_force_kN: number, total_transferred_force_kN: number,
 *            equilibrium_error_kN: number, errors: string[]}}
 */
export function mapCladdingWindLoads(input) {
  const errors = [];
  if (!input || !Array.isArray(input.patches) || input.patches.length === 0) {
    return {
      status: "blocked",
      loads: [],
      patches: [],
      total_surface_force_kN: 0,
      total_transferred_force_kN: 0,
      equilibrium_error_kN: 0,
      errors: ["patches must be a non-empty array"],
    };
  }

  input.patches.forEach((patch, i) => errors.push(...validatePatch(patch, i)));
  if (errors.length) {
    return {
      status: "blocked",
      loads: [],
      patches: [],
      total_surface_force_kN: 0,
      total_transferred_force_kN: 0,
      equilibrium_error_kN: 0,
      errors,
    };
  }

  const loadsByReceiver = new Map();
  const patchResults = [];
  let totalSurface = 0;

  for (const patch of input.patches) {
    const force = patch.area_m2 * patch.net_pressure_kpa;
    totalSurface += force;
    const transfers = [];

    for (const share of patch.load_shares) {
      const transferred = force * share.share;
      const current = loadsByReceiver.get(share.receiving_element_id) ?? {
        receiving_element_id: share.receiving_element_id,
        force_kN: 0,
        contributions: [],
      };
      current.force_kN += transferred;
      current.contributions.push({
        patch_id: patch.id,
        pressure_case_id: patch.pressure_case_id,
        material: patch.material,
        path_type: share.path_type,
        share: share.share,
        force_kN: transferred,
      });
      loadsByReceiver.set(share.receiving_element_id, current);
      transfers.push({
        receiving_element_id: share.receiving_element_id,
        path_type: share.path_type,
        share: share.share,
        force_kN: transferred,
      });
    }

    patchResults.push({
      patch_id: patch.id,
      material: patch.material,
      area_m2: patch.area_m2,
      net_pressure_kpa: patch.net_pressure_kpa,
      surface_force_kN: force,
      transfers,
      cladding_capacity_check: "not_performed",
      connection_capacity_check: "not_performed",
    });
  }

  const loads = [...loadsByReceiver.values()];
  const totalTransferred = loads.reduce((sum, item) => sum + item.force_kN, 0);
  const error = totalTransferred - totalSurface;
  const tolerance = finitePositive(input.tolerance_kN) ? input.tolerance_kN : 1e-7;

  return {
    status: Math.abs(error) <= tolerance ? "mapped_equilibrium_only" : "blocked",
    loads,
    patches: patchResults,
    total_surface_force_kN: totalSurface,
    total_transferred_force_kN: totalTransferred,
    equilibrium_error_kN: error,
    errors: Math.abs(error) <= tolerance ? [] : ["Transferred force does not balance the applied surface force"],
    limitations: [
      "Load shares must come from an explicit geometric/support model; they are never inferred from cladding material.",
      "No stiffness-based redistribution, two-way plate/membrane action, fastener design, or diaphragm action is solved.",
      "Mapped forces are not yet applied to the global frame solver or foundation model.",
      "Positive net pressure is inward; negative net pressure is suction/outward. Wind-code pressure generation remains a separate upstream task.",
    ],
  };
}

export const claddingWindMaterialOptions = [...MATERIALS];
