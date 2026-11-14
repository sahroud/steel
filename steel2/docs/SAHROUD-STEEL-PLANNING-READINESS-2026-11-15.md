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
