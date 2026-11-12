# SAHROUD STEEL — Engineering Design Basis and Roadmap

## Mission
Develop a traceable engineering workflow for steel industrial buildings and portal-frame sheds. The legacy application is a source of reusable geometry and workflows, not a design authority or architectural constraint.

## Governing principles
1. Separate user requirements, verified project facts, engineering assumptions, calculated results, and approval status.
2. Never silently convert an operational door scenario into an internal-pressure classification. Wind enclosure classification requires actual opening areas, envelope areas, opening distribution, and governing code criteria.
3. No code-design eligibility until load paths, coefficients, load combinations, and applicability checks are verified.
4. Compare viable structural systems rather than assuming a rigid portal frame is always optimal.
5. Optimize lifecycle cost and constructability, not steel mass alone.
6. Preserve input provenance, units, code edition, and revision history.
7. A successful linear solver or equilibrium check is not a strength, stability, serviceability, connection, foundation, or construction approval.

## Planned architecture
- Project brief and requirements: occupancy, envelope, operating scenarios, crane, mezzanine, expansion, exposure, fire and geotechnical data.
- Site and hazard basis: wind, snow, seismic, temperature, topography, terrain, importance and exposure.
- Load generation: documented load cases, area/line/member loads, internal/external wind pressures, patterning and combinations.
- Structural system alternatives: portal, truss, braced and hybrid options.
- Analysis: 3D frame solver with releases, diaphragms/bracing, second-order effects, stability and sensitivity checks.
- Member design: strength, local/global buckling, lateral-torsional buckling, interaction, deflection and vibration.
- Connections and foundations: explicit force transfer, connection stiffness, base plate/anchors and soil-structure inputs.
- Optimization: discrete section catalogue, fabrication constraints, member grouping, cost model and transparent objective function.
- Verification: independent benchmark problems, regression tests, equilibrium, unit tests and report traceability.

## First implementation increment
The independent design-core module adds a versioned project brief and readiness gate. It records project requirements without claiming that the existing solver can design them. The brief is intended to be saved with project JSON and restored on reopening.

## Wind basis increment
`js/wind-basis-engine.js` adds a geometry-based opening inventory for four facades. It records the selected operational opening scenario, computes gross wall areas from current span/length/eave/ridge-rise inputs, checks user-entered open areas against defined physical openings, and reports open-area ratios. It calculates only basic velocity pressure from the entered basic wind speed. It deliberately does not infer code enclosure classification from ratios, select internal/external pressure coefficients, generate wind load cases, or apply pressures to the 3D model. Its data is saved and restored with the project.

## Directional wind case register
`js/directional-wind-engine.js` adds a four-direction (+X, −X, +Z, −Z) register. For each direction it stores manual, signed external Cp values for six broad surfaces and reports net pressures for positive and negative internal-pressure scenarios. The model convention is X across the 12 m span, Y vertical, and Z along the 36 m length. For each horizontal direction, the coefficient basis is selected from the geometric h/b and h<20 m conditions: the entered external coefficient is treated as combined CgCp when the clause applies, so Cg is not multiplied a second time; otherwise it is treated as Cp and Cg is applied separately. The legacy six-surface calculator uses the same breadth-specific basis. It reads the shared coefficients from the existing climate-load registry and stores its inputs with the project. The axis labels are intentionally not mapped to physical front/rear/left/right until the model coordinate convention is verified. For the current reference geometry, total height is 7.2 m; h/b is 0.60 across the 12 m span and 0.20 along the 36 m length, both below 1.0. The register is a preliminary calculator only: no local edge/corner zones, code-derived coefficients, pressure-to-member tributary conversion, or 3D load transfer is implemented.

## Next verification tasks
- Benchmark wall and gable geometry against hand calculations.
- Test closed, front-open and custom opening scenarios, including save/reopen.
- Compare opening-area inventory with actual architectural drawings.
- Implement code-based enclosure classification only after exact applicable clauses and thresholds are verified.
- Implement external and internal pressure zones and all wind directions, then independently benchmark before connecting to the frame model.

## Current limitations
The design brief is not a load generator, analysis engine, code checker, or optimizer. Existing first-order linear analysis remains preliminary. Do not use outputs as construction design until the relevant engineering modules are implemented and independently validated.


## Wind zone geometry engine — 2026-11-12

- Added `js/wind-zone-engine.js` as a geometry-only module.
- Reads the structural model's established axes: X transverse span, Y vertical, Z longitudinal; front is negative Z and rear is positive Z.
- Uses the model's current 0.8 m roof overhang and actual span/length/eaves/rise values.
- Partitions each rectangular roof slope and each longitudinal wall into a non-overlapping 3×3 grid: four corner cells, four edge cells, and one interior cell. Each cell carries coordinates, dimensions, area, and an intentionally empty coefficient/source registry.
- Reports gross gable-end area separately. The rectangular portion is shown only as a reference; triangular gable zoning is deliberately disabled pending verification against the applicable code figure.
- The edge-depth inputs are mandatory and are not defaulted. They must be sourced from the official code provisions before use.
- Area closure is checked for each partitioned rectangle. No Cp/CgCp values, pressure values, line loads, or 3D load transfers are generated.
- `codeDesignEligible` and `loadTransferEnabled` remain false.
- Next: verify zone-depth equations and roof/wall/gable zoning against the official 1398 Sixth Issue figures and examples; only then implement coefficient registry with exact clause/table/figure/page provenance and independently checked test cases.


## Wind code traceability and zoning audit — 2026-11-12

- Added `js/wind-code-registry.js`: coefficient entries are rejected unless they include the exact 1398 edition, numeric value, surface, wind direction, zone, coefficient basis, clause, page, table or figure, and an explicit verified flag. No coefficient values are preloaded.
- Added the registry script to `index.html` after the geometry-only module.
- Audited the first zoning implementation: its 3×3 rectangles are now explicitly labelled as generic geometric cells, not code-defined zones. They must not be interpreted as the code's numbered zones (for example 1/1E/2/2E). The gable triangle remains unpartitioned.
- Corrected the eaves overhang conversion: the model's 0.8 m is horizontal, so the extension along the sloping roof plane is computed as horizontal overhang divided by the roof slope cosine. The longitudinal end overhang remains a plan-length extension.
- Located a public copy advertised as the 4th edition (1398), 179-page PDF at `https://www.mediafire.com/file/6p5gce4k1fcbrfj/mabhas06-1398.pdf/file`. The PDF download endpoint redirects to an inaccessible repair URL in the current retrieval environment; therefore the exact zoning figure/table pages could not be visually verified in this pass.
- Search results also exposed a worked example citing an edge-width expression from a prior/secondary source. It is deliberately not implemented: that is not a verified transcription of the 1398 official text and may apply to a different surface/component scope.
- Accordingly, no code zone dimensions or coefficients have been asserted. The next engineering gate is to obtain and inspect the exact 1398 pages for roof/wall zoning, effective-area dependence, wind directions, and gable geometry. Only after page-level verification may coefficient registry entries be marked verified.
- `codeDesignEligible` and `loadTransferEnabled` remain false.

## Tributary geometry audit — 2026-11-12

- Added `js/tributary-audit.js`, a separate geometry-only audit that reads the generated 3D model without modifying member loads or solver inputs.
- Checks closure of the accumulated roof-purlin tributary surface against both roof slopes including the horizontal eave overhang converted to slope length and the longitudinal end overhang.
- Checks longitudinal wall-girt tributary area against gross wall area, flags unusually large tributary heights for review, and verifies that purlin endpoints at frame stations reuse rafter node IDs.
- Checks completeness of purlin and end-girt load-record fields, including separate left/right tributary widths at ridge purlins.
- The audit is diagnostic only: it does not create pressures, derive code zones, change load values, transfer loads, or enable code-design eligibility. Geometric area closure does not prove that real cladding supports or connections follow the assumed load path.

## Load-path coverage audit — 2026-11-12

- Added `js/load-path-audit.js` as a read-only diagnostic. It checks load-record coverage on roof purlins, longitudinal wall girts and end-wall girts, plus per-end shared-node connectivity to rafters, columns and end posts.
- Reports integrated line-load totals by member group and flags the known un-loaded triangular gable area above the end-wall girts (span × rise / 2 per end).
- Does not modify member loads, solver inputs, wind coefficients, or design eligibility.
- Important limitation: shared-node topology is not proof of real connection stiffness/capacity or cladding-to-purlin attachment. End-wall gable infill, roof/wall edge transfer, bracing connections and foundation load path remain incomplete.

## End-wall and gable geometry audit — 2026-11-12

- Added `js/end-wall-audit.js` as a read-only geometry/topology audit and loaded it after the load-path audit.
- Corrected the end-wall post/chord station grid to always include the roof ridge. The previous 4 m regular grid on a 12 m span omitted the 6 m ridge station, leaving the segmented gable chord off the actual roof profile; the ridge is now an explicit shared station.
- The audit now checks post-chain arrival at the roof, shared post-top/chord node IDs, chord graph continuity, and total chord length against the two actual roof slopes.
- Computes the exact area above the highest end-wall girt by integrating the roof profile. This includes both the rectangular band between the highest girt and eaves and the triangular cap below the two roof slopes; it does not incorrectly report only `span × rise / 2` as the whole uncovered upper band.
- Reports the full gable triangle area separately, per end, and checks each end-wall post chain reaches the roof line and that the segmented gable top chord closes to the expected two-slope length.
- The existing end-wall framing contains vertical post chains, horizontal girts and a segmented top chord. That geometric framing does not establish cladding span direction, sheeting support, fastener/connection capacity, or a complete wind load path.
- No wind pressure, surface load, line load, nodal load, or solver input is created or changed. `designEligible` and `loadTransferEnabled` remain false.
- Next gate: verify the actual cladding/support arrangement and end-wall connection details, then derive tributary loads with an independent area-closure and force/moment equilibrium benchmark before any load transfer is enabled.


## Four-facade wall envelope brief — 2026-11-12

- Extended the saved engineering project brief with independent material and orientation selections for the front end wall, rear end wall, left longitudinal wall, and right longitudinal wall.
- New-project defaults are masonry brickwork on all four faces, matching the stated typical Shahrud construction context.
- Each face can be changed independently to metal sheeting, sandwich panel, or another system. For sheet/panel systems, the support orientation can be set to vertical, horizontal, or custom/unknown.
- The orientation selector is retained as a geometric/support-layout input; it does not establish panel span capacity, fastener capacity, girt/post adequacy, or a verified load path.
- Wall-envelope choices are included in the existing `designBrief` project JSON and restored when a saved project is reopened. Older project files without these fields migrate to the four-face brick default.
- No masonry dead load, out-of-plane wall pressure, panel load, restraint force, or connection action is generated or transferred to the structural solver. The envelope configuration is recorded only; `designEligible` and load transfer remain disabled pending wall build-up, thickness/weight, restraint details, openings, support spacing, product data, and independent load-path checks.


## Masonry wall quantity and restraint-data audit — 2026-11-12

- Added shared project inputs for masonry thickness, masonry unit weight, restraint-system category, and nominal horizontal/vertical restraint spacing. These values are intentionally blank/unknown by default; no unverified masonry properties are assumed.
- Added `js/masonry-wall-audit.js` as a read-only audit. It reads the four independently selected facade materials, model geometry, and registered openings.
- Gross longitudinal wall area is calculated as `length × eaves height`. Gross end-wall area includes the rectangular wall below the eaves plus the gable triangle: `span × eaves height + span × rise / 2`.
- Valid openings fully contained within the rectangular wall zone are deducted from net area. Invalid/out-of-range openings are not deducted and are explicitly flagged. The gable triangle is included in gross area; this initial opening deduction does not assume openings in the gable zone.
- For brick faces only, when both thickness and unit weight are supplied, the audit estimates total masonry self-weight as net area × thickness × unit weight. This is a quantity estimate, not a structural load distribution.
- The audit counts adjacent steel secondary members as candidate geometry only. It does not claim masonry-to-steel anchorage, restraint adequacy, or load transfer from their existence.
- Restraint category and nominal spacing are recorded as input-completeness gates. Even when supplied, engineering verification remains outstanding for out-of-plane pressure, slenderness, cracking, sliding/overturning, seismic detailing, bond beams, wall-post details, anchors, and connections.
- No dead load, wind load, restraint force, solver nodal load, or member line load is generated or changed. `designEligible=false` and `loadTransferEnabled=false` are explicit.
- Synthetic geometry test only: 12 m span, 36 m length, 6 m eaves, 1.2 m rise, 200 mm wall, 18 kN/m³ assumed test unit weight, and one 5 m × 5 m front opening produced 590.4 m² gross, 25.0 m² deducted opening, 565.4 m² net, and 2035.44 kN estimated masonry weight. This verifies arithmetic only; it is not project data, a code check, or a browser test.


## Masonry thickness and exportable bill of quantities — 2026-11-12

- Set the new-project and legacy-project migration default for all four brick facades to the user-confirmed 350 mm thickness. A non-empty saved thickness remains unchanged.
- Added saved, optional takeoff inputs for actual brick unit dimensions, mortar-joint thickness, masonry unit weight, and plaster thickness. These are left unspecified unless entered from actual project specifications.
- Added `js/quantity-takeoff.js`: calculates facade gross/net areas, valid rectangular opening deductions, masonry volume, masonry weight when unit weight is entered, estimated brick count when brick dimensions/joint are entered (includes an explicit 5% quantity allowance), theoretical mortar volume, plaster area/volume when plaster thickness is entered, approximate roof-cover area, and structural-model member counts/total lengths grouped by section key.
- Provides downloadable UTF-8 CSV (Excel-compatible) and JSON quantity reports from the browser.
- Steel member mass is intentionally not invented: it requires verified section unit masses. Fasteners, welds, connection plates, reinforcement, mortar cement/sand split, and fabrication waste remain outside this preliminary takeoff until their specifications are supplied.
- The report is a quantity estimate, not an approved construction bill or code design. No structural load transfer or design eligibility is enabled.



## Steel fabrication and connection quantity takeoff — 2026-11-12

- Added a fabrication takeoff extension that calculates steel member mass by section group from each model member's geometric length and the group's entered 3D section area A (cm²), using editable steel density (default 7850 kg/m³). Missing group areas or invalid lengths leave affected mass uncomputed rather than guessed.
- Added manually entered fabrication inventory for connection plates (count × width × height × thickness), bolts (count × nominal shank cylinder volume; head/nut/washer excluded), and fillet weld metal (length × triangular leg²/2 theoretical area).
- Added optional cutting-waste percentage applied only to structural members plus connection plates. Bolts and theoretical weld metal remain separately itemized.
- Added project-file persistence for density, waste allowance and manual connection inventory. CSV/JSON BOQ output includes steel group member count, total length, section area and calculated mass plus connection items.
- Synthetic arithmetic test only: a fabricated 9-member test model using artificial section areas produced 479.635 kg member mass, 9.420 kg plates, 1.578 kg bolt shanks and 0.565 kg theoretical weld metal. These are test fixtures, not project quantities.
- No automatic connection layout or connection demand is inferred. Connection plate/bolt/weld inventory must be entered from the actual connection drawings. Section areas and steel density must be verified against selected profiles/material certificates. This remains a preliminary takeoff, not a fabrication release or design approval.
