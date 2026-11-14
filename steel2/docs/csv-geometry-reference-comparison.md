# Comparing imported geometry with a reference model

Use `SteelCSVStructuralExchange.compareProposals(candidate, reference, {coordinateToleranceM: 0.001})` to produce a comparison-only report.

The comparison uses stable source IDs and reports:
- matched and unmatched nodes/members;
- maximum coordinate deviation and nodes outside the explicit tolerance;
- reversed I/J member orientation;
- mismatched section references;
- differences in node/member inventory.

A reversed member orientation is reported because end-I/end-J force conventions and release declarations depend on orientation. It is not silently corrected. The comparison currently does not perform geometric best-fit matching when IDs differ, compare member centerlines independent of IDs, compare section dimensions, or compare loads, restraints, connections, or drawings.

The report is diagnostic only. It does not repair the candidate model, alter the reference, activate geometry, or approve design. The reference itself must have known provenance and must be independently reviewed.
