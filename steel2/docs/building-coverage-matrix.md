# Whole-building engineering coverage matrix

This module is an evidence register for whole-building design completeness. It covers 14 load/action groups, 16 structural/building component groups, and 10 design workflow stages.

## Workflow
Use `SteelBuildingCoverageMatrix.template()` to generate a JSON template, populate each item with status (`not_started`, `in_progress`, `calculated`, `verified`, or `not_applicable`), and attach evidence/reviewer. A verified item requires both evidence and reviewer. Not-applicable requires a reason.

## Important limits
This is not a load generator, FEM solver, member design engine, or code checker. It does not assert that any missing item is unnecessary. A complete evidence register is not equivalent to independent engineering approval. Analysis and design approval remain disabled.
