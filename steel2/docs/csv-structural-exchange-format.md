# CSV structural exchange format — proposal-only import

This is a controlled interchange format for receiving geometry tables exported from a structural modelling application. It is not an IFC/SDNF/CIS/2 parser and it does not activate imported geometry in the solver.

## Required node table

UTF-8 CSV with unique headers:
`node_id,x,y,z`

- `node_id`: stable, unique source identifier.
- `x,y,z`: finite numeric coordinates.
- Supply the length unit explicitly as `m` or `mm`.
- Supply coordinate system, axes, handedness, and origin convention as separate project metadata.
- Negative coordinates are valid.

## Required member table

UTF-8 CSV with unique headers:
`member_id,start_node,end_node,section_ref`

- `member_id`: stable, unique source identifier.
- `start_node,end_node`: exact node identifiers from the node table.
- `section_ref`: source section identifier; it is not interpreted as a section property definition.

## Validation behavior

The proposal parser checks CSV quoting/row width, required columns, duplicate identifiers, finite coordinates, node references, zero-length members, explicit units, and coordinate-system metadata. When units are explicitly `mm`, coordinates are normalized to metres while raw coordinate strings and source row numbers are retained.

The output is a review proposal only:
- `status=pending_review`
- `geometryActivation=false`
- `solverEligible=false`
- `designApproved=false`

## Not yet imported

This first exchange stage does not import section dimensions/station profiles, end releases, support restraints, local member axes, loads, offsets, rigid links, or connection details. These must be supplied in additional, separately specified tables and cross-checked before any solver integration.
