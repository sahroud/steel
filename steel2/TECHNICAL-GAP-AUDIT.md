[object Object]

### Reference suite count and CI status update — 2026-11-17

- The reference suite now contains 12 authored tests: six solver fixtures, four pressure/tributary-width transfer fixtures, and two triangular-gable resultant fixtures.
- The CI workflow path filter now includes `model-3d.js`, `load-transfer.js`, and `index.html` in addition to solver/tests.
- GitHub connector returned no PR-triggered workflow runs for the latest test commit, and combined commit status is empty. This is **not a passing result**; execution remains unverified and must be checked in the repository Actions UI or via a workflow-run listing endpoint that includes push-triggered runs.
- The test suite's roof tributary-width checks call the same helper now used by the geometry builder. They still do not build a complete shed or test the solver's assembled response to those loads.


### Gable wind equivalent actions — 2026-11-17

- Added `triangularGablePostEquivalentLoads` to `load-transfer.js`. It divides the complete triangular gable area into tributary cells for every post station, including both end stations; it calculates a base/top force pair for each support line.
- The equivalent force pairs preserve the signed resultant and the first moment about the base. The centroid calculation includes the eave height, so the equivalent actions are not incorrectly referenced only to the gable rise.
- Added two reference tests for complete area/force/moment conservation, edge tributaries, suction sign, and invalid eave geometry. The suite now contains 14 authored tests; execution is still unverified.
- **Not yet connected to the 3D model.** The current end-wall geometry creates separate, coincident end-wall head nodes at the eaves and does not explicitly share them with the main frame eave nodes. Applying the boundary tributary actions before resolving that connectivity would risk loading disconnected nodes and producing a misleading equilibrium result. The new helper is therefore a verified-by-formula calculation candidate, not an active design load path.
- Next required geometry step: explicitly share end-wall eave/ridge nodes with the main frame, map each end-wall post base/head to stable node IDs, then pass the calculated six-component nodal actions through the worker. Add a complete-model check for force and moment equilibrium before enabling this wind contribution.


### Triangular end-wall wind transferred into the 3D solver — 2026-11-17

- The gable equivalent-load helper now also calculates the transverse eccentricity moment about each post station. This is required because the two edge tributary strips have centroids offset from their boundary post lines; omitting this couple would conserve total force and overturning moment about the eaves but not the global moment about the vertical axis.
- The end-wall wind transfer is now assembled as six-component global nodal actions: signed Z forces at the base/head nodes and the corresponding Y-axis nodal couple at the base. Front-face positive pressure is +Z; rear-face positive pressure is -Z. Pressure values remain the existing signed net end-wall pressures in kPa.
- The worker now forwards `nodalLoads` to the 3D solver. The solver already accepts six-component nodal loads and includes their forces and moments in its global equilibrium residual.
- Geometry uses the shared-node registry (`addNode`) at coincident coordinates. The transfer now resolves every base/head by exact model coordinates and checks that base/head nodes connect to a column or end post/rafter before applying any action. Missing or disconnected nodes cause analysis to stop with an explicit error rather than silently dropping load.
- The load is applied only when the selected case is the direct wind case or a combination object carries a nonzero wind factor. The existing named combo presets do not yet carry wind factors; their wind-combination coverage remains an open item.
- Reference arithmetic check on the 12 m × 2 m gable, 6 m eave, 1.2 kPa pressure and four intervals: area 12 m², resultant 14.4 kN, global overturning moment 96 kN·m and global transverse moment -86.4 kN·m. The 14 authored tests remain in the suite; source syntax and these arithmetic invariants were checked, but full browser/model execution and the complete Node test suite are not yet confirmed.
- Important scope limit: this implementation uses a constant signed net pressure over the triangular gable region. It does not replace the official wind-pressure calculation or verify pressure coefficients, internal pressure, shielding, dominant openings, or code load combinations. Those inputs and factors still require authoritative code validation.
