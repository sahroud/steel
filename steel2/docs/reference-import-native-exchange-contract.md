# Reference import provenance and native exchange contract

This contract defines evidence capture for historical and customer project imports. It does not authorize geometry activation, analysis, member design, or construction.

## Supported source locator rules

| Source format | Minimum stable locator |
|---|---|
| SPS | Original path, 1-based line, section, exact key |
| XLSX | Original path, worksheet name, cell address; preserve formula and cached value when available |
| DOC/PDF | Original path and 1-based page; add paragraph/table locator when available |
| M3/IFC/SDNF/CIS2 | Original path and stable native object/member/node identifier |
| CSV | Original path and 1-based line or stable object identifier |
| OTHER | Original path and explanatory locator note |

A locator must identify where a value came from, not what the value means. Do not manufacture identifiers from row order when the source provides stable IDs.

## Immutable source identity

When possible, record `sourceChecksum` as `sha256:<64 lowercase hexadecimal characters>` over the exact original file bytes. A path or filename alone does not establish that the source has remained unchanged. If the checksum is not available, retain the source revision/date and emit a warning; do not claim immutable provenance.

## Raw values and interpretation

- Preserve raw key and raw value without unit conversion or semantic renaming.
- Keep numeric-looking source strings as strings where that is how they were represented.
- Store units separately; unknown units remain null.
- Negative coordinates are valid. Axis, origin, units, and member orientation must be resolved independently.
- For XLSX, retain formula and cached value as distinct evidence fields in the extractor; never silently replace one with the other.
- For M3, request a supported export (IFC, SDNF/CIS/2, or CSV tables for nodes, member connectivity, section stations, releases, and supports). The binary M3 file is not treated as parsed geometry.

## Validation and activation gates

The read-only evidence validator checks source-specific locator completeness, optional SHA-256 syntax, raw key/value presence, and fail-closed gate flags. It does not verify that a checksum matches a file, validate a file's contents, infer units, or map objects to structural members.

A mapping marked `reviewed` remains distinct from engineering approval. Imported records must retain `solverEligible=false` and `designApproved=false`. Any future activation requires a separately specified and independently reviewed protocol, including geometry, units, coordinate systems, load provenance, code basis, and reviewer sign-off.

## Export request for the Shahrood M3 model

Request from the original modelling software:
1. IFC or SDNF/CIS/2 export with stable object identifiers; or
2. CSV tables for node IDs and XYZ coordinates, member IDs and start/end node IDs, section definitions and station-wise dimensions, end releases, support restraints, and local-axis/orientation data.

Do not reconstruct the 3D model from SPS suffixes or undocumented binary offsets.
