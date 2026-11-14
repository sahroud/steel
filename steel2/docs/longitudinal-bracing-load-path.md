# Longitudinal bracing load-path readiness

## Purpose

This stage adds a fail-closed topology and load-assignment audit for end-wall wind reaching the longitudinal roof/wall bracing system. It does not create a diaphragm, collector, or member capacity model.

## Implemented checks

- An end-wall face is active only when its explicit pressure input is finite and nonzero.
- Every active face must have end-girt members.
- For each active end-girt segment, the explicit tributary height and assigned `lineLoads.windEnd` must reconcile with the face pressure:
  `q = p × h_t`.
- Both endpoints of every loaded end-girt segment are traced through actual shared-node FEM members to an endpoint of a wall or roof brace.
- The loaded end-girt itself is excluded from the route graph, and brace members are treated as route targets rather than as collector links. This prevents a member from proving its own transfer path.
- The audit is integrated into `SteelWholeBuildingLoadPathAudit`; an incomplete route adds a blocking issue to the whole-building load-path result.
- Brace axial demand extraction separately requires exact coverage of every expected case label. Duplicate labels cannot hide a missing combination.

## Interpretation

A successful result means only that the pressure-to-line-load assignment reconciles and that a geometric path of shared FEM nodes and intervening structural members reaches a brace endpoint. It does **not** prove:

- diaphragm stiffness or in-plane shear transfer;
- collector/drag-strut design or connection slip resistance;
- correct connection fixity, member stiffness, or real-world detailing;
- the force split between roof and wall bracing;
- brace tension rupture, compression buckling, gusset, bolt, or weld capacity;
- code-compliant wind pressures or complete gable/edge/corner pressure coverage.

The actual force distribution must come from the global FEM solution for each valid load case. The resulting brace forces remain demand-only until force sign conventions, member section data, unbraced lengths, restraint conditions, and applicable code checks are verified.

## Regression coverage

- `SteelLongitudinalBracingReadiness.selfTest()`: 9 tests.
- `SteelBraceForceDemandAudit.selfTest()`: 10 tests.
- `SteelWholeBuildingLoadPathAudit.selfTest()`: 35 tests.
- `SteelMemberDesignScopeGate.selfTest()`: 8 tests.

These are deterministic software tests, not browser validation, independent solver comparison, or engineering approval.


## Axial end-force sign normalization

The solver local end-force convention is version 1: for a tensile member action, `Fx_i` is negative and `Fx_j` is positive; compression reverses both signs. The force-envelope demand helper now normalizes each end to tension-positive (`-Fx_i` at end I and `+Fx_j` at end J). The brace demand audit performs the same end-aware normalization only when the exact solver convention metadata is present. It reports raw end actions and separate tension/compression magnitudes per end; it still does not calculate resistance or approve a brace. Duplicate load-combination labels are rejected before analysis.

Regression coverage adds paired tension/compression tests at both ends and an unrecognized-convention rejection test. These are software checks; they do not replace independent solver benchmarking or engineering review.


## Fresh generated-model audit in the application

The model panel now has a dedicated action, **ممیزی هندسه تازه‌ساخته و مسیر بار**. The action calls `SteelStructuralModel.build()` at click time, then passes that exact returned model object to `SteelFreshModelStructuralAudit.audit()`. The report includes node/member identity checks, missing endpoints, zero-length members, end-wall gable topology, the whole-building load-path audit, and the longitudinal-bracing readiness result. It records the model generation timestamp and member counts. This avoids treating a stored `default-project.json` structural snapshot as if it were the current FEM model.

The audit is a user-triggered browser check; it has not been run against the current browser inputs in this development session. A successful topology result remains distinct from a stiffness/collector analysis or code design approval.


## FEM tensile-demand bridge

The tensile-input readiness audit now attempts to obtain the maximum tensile axial demand for each configured member group (`roofBrace`, `wallBrace`, and `endPost`) from the current member-force envelope. It normalizes end I as `-Fx_i` and end J as `+Fx_j`, then searches all exact load-case labels and all members in the group. Extraction is blocked unless the envelope is equilibrated, the solver sign convention is recognized, and every group member has complete per-case force vectors. A manually entered demand is retained but compared with the FEM-derived maximum and a warning is emitted when the difference exceeds 1% (with a 0.01 kN floor).

This bridge supplies demand only. Gross yielding, net/effective-section rupture, block shear, shear lag, gusset, bolt and weld resistance remain unimplemented pending the applicable official clause set and connection geometry.


## FEM compression-demand bridge

The compression-member readiness audit now extracts the maximum compression demand for each configured member group from the current member-force envelope. It checks both ends of every member and every exact load-case label, retaining the governing member, case and end. Extraction is blocked unless all cases equilibrate, the verified axial sign convention is present, all force vectors are valid, and the member/case coverage is exact. This is demand extraction only; it does not calculate compression resistance, effective length, local slenderness, flexural-torsional buckling or N-M interaction.


## Flexure and shear demand provenance

The flexure/shear readiness report now verifies exact load-case label coverage for each member, rather than relying only on a matching case count. It scans simultaneous end actions and reports the maximum absolute bending component and shear component separately, retaining the governing member, combination, end and component. These two maxima may belong to different combinations and are not combined into a synthetic interaction case. The report remains demand/readiness only and does not calculate resistance.


## Tensile-demand governing location

The tensile FEM bridge now retains the governing member ID, exact load-case label and member end for the maximum tension demand, and checks that no extra/unmapped force-envelope members are present. The UI reports this provenance alongside the maximum tensile demand. This remains an axial demand only; no tensile resistance or connection capacity is asserted.
