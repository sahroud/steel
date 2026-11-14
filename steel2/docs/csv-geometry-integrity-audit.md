# Geometry integrity audit for CSV exchange proposals

The optional geometry audit runs after `buildProposal` and before any human review. Example:

```js
const parsed = SteelCSVStructuralExchange.buildProposal(input);
if (parsed.success) {
  const audit = SteelCSVStructuralExchange.auditProposal(parsed.proposal);
  // inspect audit.summary, audit.warnings, and audit.issues
}
```

It reports node/member counts, connected components, orphan nodes, coincident or near-coincident coordinates (default tolerance 1e-6 m), coordinate bounds, and member length range.

Disconnected components and orphan nodes are warnings, not automatic rejection: a model may intentionally contain independent frames or separate subsystems. Duplicate member IDs and missing node references are errors. This audit does not infer member orientation correctness, local axes, structural restraints, load paths, or physical connectivity through connections not represented by shared nodes.

The audit remains diagnostic only: `geometryActivation=false`, `solverEligible=false`, and `designApproved=false`. It is not a structural adequacy check or independent engineering validation.
