[object Object]

### Reference suite count and CI status update — 2026-11-17

- The reference suite now contains 12 authored tests: six solver fixtures, four pressure/tributary-width transfer fixtures, and two triangular-gable resultant fixtures.
- The CI workflow path filter now includes `model-3d.js`, `load-transfer.js`, and `index.html` in addition to solver/tests.
- GitHub connector returned no PR-triggered workflow runs for the latest test commit, and combined commit status is empty. This is **not a passing result**; execution remains unverified and must be checked in the repository Actions UI or via a workflow-run listing endpoint that includes push-triggered runs.
- The test suite's roof tributary-width checks call the same helper now used by the geometry builder. They still do not build a complete shed or test the solver's assembled response to those loads.
