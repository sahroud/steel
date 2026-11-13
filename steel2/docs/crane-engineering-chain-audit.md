# Crane engineering chain audit

The `crane-engineering-chain-audit.js` module cross-checks traceability between:
1. synchronized two-rail transfer cases,
2. 3D frame analysis cases, and
3. left/right runway-girder FEM cases.

## Input contract

The JSON record includes a project ID and model revision. Every stage exports case IDs and links downstream cases to the source transfer case ID. Both rails must be present in each transfer case; the 3D frame and both runway-girder solutions must confirm equilibrium; each wheel/rail source must be recorded.

## What it checks

- identical model revision across project, frame, and runway-girder stages;
- unique IDs within each stage;
- one-to-one case coverage and no orphan downstream cases;
- explicit links to source transfer case IDs;
- simultaneous left/right rail presence;
- equilibrium flags for the 3D frame and both girder solutions;
- traceable wheel-load and rail source references;
- equal case counts across the three stages.

## Limitations

This is a manual JSON evidence/traceability gate. It does not yet auto-export records from solver modules. A passing result only establishes internal consistency of the submitted metadata; it does not establish that the values are physically correct, that FEM assumptions are valid, or that a design complies with any code. `analysisEnabled` and `designApproved` remain false.
