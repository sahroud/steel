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
`js/directional-wind-engine.js` adds a four-direction (+X, −X, +Y, −Y) register. For each direction it stores manual, signed external Cp values for six broad surfaces and reports net pressures for positive and negative internal-pressure scenarios. It reads the shared coefficients from the existing climate-load registry and stores its inputs with the project. The axis labels are intentionally not mapped to physical front/rear/left/right until the model coordinate convention is verified. The register is a preliminary calculator only: no local edge/corner zones, code-derived coefficients, pressure-to-member tributary conversion, or 3D load transfer is implemented.

## Next verification tasks
- Benchmark wall and gable geometry against hand calculations.
- Test closed, front-open and custom opening scenarios, including save/reopen.
- Compare opening-area inventory with actual architectural drawings.
- Implement code-based enclosure classification only after exact applicable clauses and thresholds are verified.
- Implement external and internal pressure zones and all wind directions, then independently benchmark before connecting to the frame model.

## Current limitations
The design brief is not a load generator, analysis engine, code checker, or optimizer. Existing first-order linear analysis remains preliminary. Do not use outputs as construction design until the relevant engineering modules are implemented and independently validated.
