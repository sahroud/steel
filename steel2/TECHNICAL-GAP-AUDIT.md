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
