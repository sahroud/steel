# SAHROUD STEEL — tapered fabrication and per-case force integration

## What is connected

- The fabrication comparison panel reads the three geometric stations already entered for the selected column or rafter in the tapered-section editor.
- The user enters the physical member length, density, steel price, weld-line count and weld rate explicitly. Blank prices and blank weld inputs remain unknown; they are not converted to zero.
- The comparison reports three quantity alternatives: uniform section based on the largest station area, continuously interpolated taper, and stepped midpoint sections.
- The panel is a geometric/weight/cost comparison only. It does not establish structural adequacy or fabrication feasibility.

## Per-combination force preservation

- The 3D combination solver retains, for every combination, the member IDs and the complete 12-component local end-force vector for every solved member.
- The solved combination summaries are published to both the structural model and the shared analysis registry.
- The automatic workflow awaits the asynchronous combination solver before checking its results.
- The tapered-case bridge maps each physical tapered segment to its exact result in every combination, preserves the simultaneous 12-component vector, and rejects missing segments, malformed vectors, duplicate IDs or a combination without a successful equilibrium flag.
- The resulting data can be passed to `SteelTaperedMemberDesignReadiness.audit({members, loadCases, memberInputs})` after the project-specific restraint, material, connection and code-basis inputs are supplied.

## Important boundaries

- The force bridge is a demand traceability bridge, not a resistance or stability engine.
- The current tapered FEM representation remains a piecewise-prismatic segmentation using midpoint section properties. It is not an exact continuously varying beam stiffness formulation.
- No claim is made here for LTB, local/global buckling, interaction, serviceability, connection strength, weld design, convergence or Iranian code compliance.
- A complete force trace does not imply a complete or safe design.
