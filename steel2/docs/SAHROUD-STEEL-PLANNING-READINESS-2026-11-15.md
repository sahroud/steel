# SAHROUD STEEL — planning readiness package
Date prepared: 2026-11-14
Target: reach a controlled, reviewable implementation plan by 2026-11-15.
Branch: `refactor/centralized-project-state-20261112`

## 1. Purpose and boundary
This is a planning baseline for the next implementation phase, not a statement that the product is complete or that the reference shed has been independently verified. The reference project is a regression/reconstruction case only. No solver activation or design approval is granted by this document.

## 2. Evidence now captured
- Original project Word report, calculation workbook, SPS settings and native M3 file identified in Dropbox.
- Reference geometry and legacy loads recorded in `reference-projects/shahrood-24x60-crane30t-1396.json`.
- Workbook crane/foundation values recorded in `reference-projects/shahrood-24x60-crane30t-1396-extraction-ledger.json`.
- 658 SPS entries parsed into indexed raw groups in `reference-projects/shahrood-24x60-crane30t-1396-sps-indexed-extraction.json`.
- Native M3 file is present but binary; Dropbox text extraction does not decode its geometry.
- The app uses a JSON project model with `structuralModel.geometry`, `nodes`, and `members`; default project is a different 12 m x 36 m, 7-frame example. It must not be overwritten by the 24 m x 60 m reference case.
- Existing tapered-member infrastructure is station-based (start/mid/end) and the 3D solver currently receives piecewise-prismatic segment properties; it is not an exact tapered-beam stiffness solution.

## 3. Planning workstreams and deliverables

| ID | Workstream | Deliverable | Dependency / acceptance gate |
|---|---|---|---|
| P0 | Source archive and provenance | Source manifest, raw-value ledger, conflicts | All extracted values linked to source file and units; unknowns stay null |
| P1 | Legacy SPS parser | Deterministic parser + schema + tests | Parses key/value records, duplicate keys, indexed groups; never invents member IDs or units |
| P2 | XLSX sheet mapping | Sheet/cell-level crane, section, load and footing extraction | Workbook cells/formulas mapped; flattened text not sufficient for final import |
| P3 | Native model interchange | IFC/SDNF/CIS/2 or documented node/member export | Node coordinates, member connectivity, section stations, releases and supports retained |
| P4 | Parametric reconstruction | Reference-only 3D model package | Every node/member/section has provenance; geometry audit passes; no guessed geometry |
| P5 | Crane load train | Per-bridge, trolley, end-truck, wheel and longitudinal/transverse cases | Vendor-certified maximum/minimum wheel reactions and wheel positions reconcile with workbook |
| P6 | Current code basis | Project code-basis record | Explicit M6/M10/2800 editions and local climate inputs approved for the project |
| P7 | 3D analysis and load path | Model audit, analytical benchmarks, exact simultaneous member actions | No unresolved load transfer, supports, DOF or equilibrium gaps |
| P8 | Member and connection design | Columns, rafters, runway, brackets, braces, bolts, welds | Complete interaction/stability/local checks and code clause traceability |
| P9 | Foundation and civil | Soil profile, reactions, footing/anchors/tie beams, quantities | Geotechnical report and full reaction envelopes; all stability and RC checks |
| P10 | Outputs and release | DXF/PDF drawings, Word/PDF calculation report, BOQ, PWA package | Reproducible output, regression suite, independent engineering review |

## 4. Immediate blockers (must be resolved before a reference-model solve)
1. M3 geometry cannot be decoded from the available connector text. Export a documented interchange file from SOOLE PARDAZ.
2. SPS suffixes such as 100/101/102/103 are raw record keys, not proven physical station coordinates or member identifiers.
3. Workbook extraction is flattened. Section tables and crane calculations need worksheet/cell mapping.
4. Crane bridge mass/reaction conflicts remain: 22.8 t, 25.28 t and 25.3 t; 28.79 t and 21.49 t are separate visible legacy cases; 26.588 tf remains unmapped.
5. Foundation values are legacy checks only; geotechnical profile, groundwater, base stiffness, anchors and reinforcement schedule are not independently verified.
6. Current code edition and site-specific wind/snow/seismic data need explicit selection and provenance.

## 5. Work sequence to reach a reliable plan by 2026-11-15
### Phase A — freeze the scope and data dictionary
- Freeze project entities: building, frame, member, section station, crane bridge, trolley, end truck, wheel, support, load case, combination, foundation.
- Define SI canonical units and explicit conversion adapters for legacy kgf/cm/tonf data.
- Define provenance object: source file ID, worksheet/cell or key, raw value, parsed value, unit, confidence, reviewer, status.
- Define states: `raw`, `transcribed`, `mapped`, `reconciled`, `verified`, `approved`.

### Phase B — import and validation architecture
- Implement SPS parser as a read-only importer. Do not connect it directly to the solver.
- Implement workbook cell mapper with sheet/range evidence.
- Implement interchange importer for documented node/member geometry.
- Build a reconciliation screen for conflicts and unresolved mappings.

### Phase C — technical implementation plan
- Map the reference case to the existing structural model only after P2/P3.
- Connect the existing crane load ledger to explicit wheel coordinates and bridge-specific load cases.
- Close M6 combination coverage and preserve exact simultaneous member action vectors.
- Extend tapered-member design only after exact section station and force mapping are available.
- Carry reactions through brackets, columns, bases, anchors, foundations and tie beams.

### Phase D — verification and release gates
- Unit tests for parsers and unit conversions.
- Geometry invariants: duplicate IDs, disconnected members, zero-length members, unsupported DOFs, invalid section dimensions.
- Analytical benchmarks and mesh convergence.
- Load equilibrium and end-to-end load-path tests.
- Regression comparison against legacy results, explicitly marked as historical comparison and not as code approval.
- Independent review before any engineering release.

## 6. Requested source exports for the user
From SOOLE PARDAZ, export the same reference project as:
1. IFC or SDNF/CIS/2 if available;
2. otherwise node coordinates + member connectivity + member section station table + releases/supports in CSV/Excel;
3. separate load case and crane wheel reaction report;
4. elevation/plan drawings in DXF/PDF.
Also provide the crane manufacturer's bridge/end-truck/trolley weights, wheel count, wheel spacing and certified maximum/minimum wheel reactions.

## 7. Next-day planning acceptance checklist
- [ ] Scope and product modules frozen.
- [ ] Canonical data model and provenance states agreed.
- [ ] Import formats and required user exports specified.
- [ ] Workstream dependencies and milestones approved.
- [ ] Crane and M3 blockers assigned.
- [ ] Code-basis selection process defined.
- [ ] Test and independent-review gates defined.
- [ ] No unsafe default or legacy value silently promoted to design input.

## 8. Current release state
`planningStatus = draft_for_review`
`referenceModelReady = false`
`solverForReferenceEnabled = false`
`designApproved = false`
`mainBranchModified = false`


## 2026-11-14 evening execution update — SPS parser delivered

### Implemented
- Added `steel2/js/legacy-sps-parser.js` as a standalone read-only parser.
- Added `steel2/docs/legacy-sps-parser-contract.md` defining its input, output, prohibited inferences, and future activation gate.
- Added `steel2/reference-projects/shahrood-24x60-crane30t-1396-sps-source-line-extraction.json` containing 658 raw key/value records with source line numbers, section names, indexed-key groups, and explicit fail-closed flags.
- The original Dropbox SPS file was read but not modified.

### Actual-source parse result
- Source: `/soole/FRAME Span(24)x60x12.75m-Crane 30t-SHAHROOD(1396-8-11@12,58).SPS`
- 661 lines; 658 parsed entries; one section (`UserInfo`); 143 trailing-numeric key groups.
- No duplicate-key or unparsed-line warnings in the extracted source text.
- Seven parser self-tests passed (7/7).
- The parser preserves numeric-looking values as strings and records line provenance.
- No unit inference, physical station/member mapping, geometry generation, solver activation, or design approval is performed.

### Next critical data gate
The source SPS is now line-traceable. The next high-value task is workbook cell-level mapping and native-model interchange. The current extracted workbook text does not supply reliable sheet/cell addresses; request an export of the original workbook sheets (including formulas and cell addresses) and a native model export (IFC, SDNF/CIS/2, or node/member/section-coordinate CSV). Until these are available, keep SPS section candidates unmapped and do not connect the parser to the solver.

### Updated state
- `spsParserImplemented=true`
- `spsActualSourceParsed=true`
- `spsRawEntriesArchived=658`
- `spsParserSelfTests=7/7`
- `spsGeometryActivated=false`
- `referenceModelReady=false`
- `solverForReferenceEnabled=false`
- `designApproved=false`
- `mainBranchModified=false`


## Reference import provenance contract — added 2026-11-14

- Added `steel2/schemas/reference-import-record.schema.json`.
- Added `steel2/docs/reference-import-provenance-contract.md`.
- The record separates immutable source locator, raw value, proposed semantic interpretation, normalized unit/value, entity reference, coordinate/orientation, and approval gate.
- XLSX locator requires worksheet and cell address; SPS locator requires line, section, and key.
- Mapping lifecycle is `unmapped → candidate → cross_checked → reviewed`; these labels do not independently activate the solver.
- Schema version 1.0.0 hard-codes `solverEligible=false` and `designApproved=false`. A future activation protocol must be reviewed separately.
- This is a data contract and documentation deliverable, not yet wired into the UI or import runtime.


## 2026-11-14 night update — SPS parser connected to regression suite

- Registered `js/legacy-sps-parser.js` in `steel2/index.html` immediately before the engineering regression suite.
- Added a regression-suite check requiring all seven parser self-tests to pass.
- Verified JavaScript syntax for both the parser and regression suite using syntax compilation.
- Executed the parser self-test in an isolated JavaScript context: 7/7 passed.
- Verified script load order: parser is loaded before the regression suite.
- This does not constitute a full browser/UI run, full application regression run, SPS semantic mapping, solver activation, or engineering validation.

### Current next gates (ordered)
1. Obtain workbook sheet/cell/formula evidence and map crane/section/load/foundation values.
2. Obtain native model interchange export with node coordinates, member connectivity, section stations, releases and supports.
3. Reconcile crane bridge/trolley/end-truck identities and certified wheel reactions; do not merge conflicting historical cases.
4. Freeze canonical SI units, source provenance, code editions and Shahrud climate/geotechnical inputs.
5. Reconstruct the reference model only from mapped/verified geometry; then run geometry, load equilibrium and load-path gates.

### Current state remains fail-closed
- `spsParserLoaded=true`
- `spsParserRegressionCheckRegistered=true`
- `spsParserSelfTests=7/7`
- `fullBrowserRegressionRun=false`
- `referenceModelReady=false`
- `solverForReferenceEnabled=false`
- `designApproved=false`
- `mainBranchModified=false`
