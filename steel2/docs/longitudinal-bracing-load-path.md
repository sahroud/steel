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
