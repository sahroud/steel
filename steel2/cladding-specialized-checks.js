const finite=Number.isFinite, pos=v=>finite(v)&&v>0, nonneg=v=>finite(v)&&v>=0;
const blocked=errors=>({status:"blocked",errors});
const status=ratios=>Object.values(ratios).every(finite)?(Math.max(...Object.values(ratios))<=1?"passes_supplied_limits_only":"fails_supplied_limits"):"blocked";

/** One-metre masonry strip, simply supported, uniform out-of-plane pressure. */
export function checkMasonryOutOfPlane(x){
 const e=[]; if(!pos(x?.clear_span_m))e.push("clear_span_m must be > 0"); if(!finite(x?.net_pressure_kpa))e.push("net_pressure_kpa must be finite");
 if(!pos(x?.flexural_design_resistance_kNm_per_m))e.push("flexural_design_resistance_kNm_per_m must be > 0");
 if(!pos(x?.shear_design_resistance_kN_per_m))e.push("shear_design_resistance_kN_per_m must be > 0");
 if(!x?.support_condition||!x?.resistance_source)e.push("support_condition and resistance_source are required"); if(e.length)return blocked(e);
 const p=Math.abs(x.net_pressure_kpa),L=x.clear_span_m,M=p*L*L/8,V=p*L/2,ratios={out_of_plane_flexure:M/x.flexural_design_resistance_kNm_per_m,shear:V/x.shear_design_resistance_kN_per_m};
 return {status:status(ratios),demands:{moment_kNm_per_m:M,shear_kN_per_m:V},ratios,pressure_sign:Math.sign(x.net_pressure_kpa),assumptions:["one-metre-high strip","simply supported","uniform pressure"],limitations:["Not a complete masonry-code design: resistance must reflect units, mortar, thickness, reinforcement, slenderness, openings and actual restraint.","No arching, two-way action, cracking redistribution, stability, seismic interaction, wall anchors or collector design."],resistance_source:x.resistance_source};
}

/** Independent metal-sheet/fastener failure-mode demand ratios. */
export function checkMetalSheetCladding(x){
 const e=[]; if(!finite(x?.net_pressure_kpa))e.push("net_pressure_kpa must be finite");
 for(const k of ["fastener_tributary_area_m2","fastener_tension_resistance_kN","sheet_pull_over_resistance_kN","support_pull_out_resistance_kN","sheet_tear_resistance_kN"])if(!pos(x?.[k]))e.push(k+" must be > 0");
 if(!finite(x?.fastener_shear_demand_kN)||x.fastener_shear_demand_kN<0)e.push("fastener_shear_demand_kN must be >= 0"); if(!x?.resistance_source)e.push("resistance_source is required"); if(e.length)return blocked(e);
 const T=Math.abs(x.net_pressure_kpa)*x.fastener_tributary_area_m2,ratios={fastener_tension:T/x.fastener_tension_resistance_kN,sheet_pull_over:T/x.sheet_pull_over_resistance_kN,support_pull_out:T/x.support_pull_out_resistance_kN,sheet_tear:T/x.sheet_tear_resistance_kN};
 return {status:status(ratios),demands:{fastener_tension_kN:T,fastener_shear_kN:x.fastener_shear_demand_kN},ratios,pressure_sign:Math.sign(x.net_pressure_kpa),limitations:["Independent failure-mode ratios only; no tension-shear interaction or redistribution.","No sheet bending, local buckling, bearing, fatigue, corrosion, edge-distance or group effects.","Resistances must match actual profile, thickness, fastener, washer, substrate and installation."],resistance_source:x.resistance_source};
}

/** Manufacturer-table envelope check; no interpolation or extrapolation. */
export function checkSandwichPanel(x){
 const e=[]; if(!finite(x?.net_pressure_kpa))e.push("net_pressure_kpa must be finite");
 for(const k of ["span_m","manufacturer_design_pressure_kpa","manufacturer_max_span_m","fastener_design_tension_kN","fastener_tributary_area_m2"])if(!pos(x?.[k]))e.push(k+" must be > 0");
 if(!x?.product_id||!x?.data_source)e.push("product_id and data_source are required"); if(e.length)return blocked(e);
 const p=Math.abs(x.net_pressure_kpa),T=p*x.fastener_tributary_area_m2,ratios={panel_pressure:p/x.manufacturer_design_pressure_kpa,span:x.span_m/x.manufacturer_max_span_m,fastener_tension:T/x.fastener_design_tension_kN};
 return {status:status(ratios),demands:{net_pressure_kpa:p,span_m:x.span_m,fastener_tension_kN:T},ratios,pressure_sign:Math.sign(x.net_pressure_kpa),data_basis:"manufacturer_supplied_design_limits_at_declared_configuration",limitations:["Data must match thickness, core, facing, orientation, support count/width, fastener layout, temperature and load duration.","No interpolation/extrapolation, independent bending, core shear, wrinkling, creep, thermal bowing or joint sealing check.","Fastener check does not replace pull-over, pull-out, substrate or combined-action checks."],product_id:x.product_id,data_source:x.data_source};
}

/** Shallow-parabolic, unit-width greenhouse-film membrane equilibrium estimate. */
export function estimateGreenhouseFilmMembraneDemand(x){
 const e=[]; if(!pos(x?.span_m))e.push("span_m must be > 0"); if(!pos(x?.sag_m))e.push("sag_m must be > 0");
 if(pos(x?.span_m)&&pos(x?.sag_m)&&x.sag_m>=x.span_m/2)e.push("sag_m must be < span_m/2");
 if(!finite(x?.net_pressure_kpa))e.push("net_pressure_kpa must be finite"); if(!nonneg(x?.prestress_kN_per_m))e.push("prestress_kN_per_m must be >= 0");
 if(!x?.film_product_id||!x?.data_source)e.push("film_product_id and data_source are required"); if(e.length)return blocked(e);
 const p=Math.abs(x.net_pressure_kpa),L=x.span_m,f=x.sag_m,H=p*L*L/(8*f),V=p*L/2,R=Math.hypot(H+x.prestress_kN_per_m,V);
 const out={status:"demand_estimate_only",demands:{pressure_induced_horizontal_tension_kN_per_m:H,support_vertical_reaction_kN_per_m:V,estimated_peak_edge_resultant_kN_per_m:R,prestress_kN_per_m:x.prestress_kN_per_m},geometry:{span_m:L,sag_m:f,sag_to_span:f/L},pressure_sign:Math.sign(x.net_pressure_kpa),assumptions:["unit-width strip","uniform pressure","shallow parabolic shape","static equilibrium"],limitations:["Not nonlinear membrane FEA or design approval.","No biaxial stress, seams, clamps, cables, creep, temperature, pretension loss, flutter, snap-through, ponding or aeroelastic interaction.","Requires product tensile data and full geometry for actual stress and frame/anchor reactions."],film_product_id:x.film_product_id,data_source:x.data_source};
 if(pos(x.design_tensile_resistance_kN_per_m)){out.ratio_to_supplied_tensile_resistance=R/x.design_tensile_resistance_kN_per_m;out.status=out.ratio_to_supplied_tensile_resistance<=1?"passes_supplied_tensile_limit_only":"fails_supplied_tensile_limit";}else out.capacity_check="not_performed_no_documented_design_tensile_resistance";
 return out;
}
