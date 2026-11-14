# Reference import record and provenance contract

This is the planned evidence model for importing the Shahrood legacy project and future customer projects. It separates the source fact from the engineering interpretation.

## Record structure
- **source** identifies the immutable source and exact locator (SPS line/key, Excel sheet/cell, document page, or native model object).
- **raw** preserves the literal key and value. Numeric-looking strings must remain strings until units and meaning are confirmed.
- **interpretation** stores the proposed meaning, normalized value/unit, entity reference, coordinate and orientation. Every proposed mapping has a status.
- **gate** is fail-closed: this schema version only permits `solverEligible=false` and `designApproved=false`.

## Mapping lifecycle
1. `unmapped`: raw source captured; no semantic claim.
2. `candidate`: a possible mapping exists but is not cross-checked.
3. `cross_checked`: independently corroborated by another source (e.g. workbook cell or native model export).
4. `reviewed`: engineering reviewer has accepted the mapping and recorded evidence.

The lifecycle does not itself grant solver eligibility. A later, separately reviewed activation protocol must define which combinations of evidence, unit checks, geometry checks, and reviewer approvals are sufficient.

## Source locator requirements
- SPS: original path + line + section + key.
- XLSX: original path + worksheet + cell address; include formula and cached value in a future workbook extractor.
- DOC/PDF: original path + page and, where possible, paragraph/table locator.
- M3/IFC/SDNF/CIS2/CSV: original path + native object/member/node identifier.

## Non-negotiable rules
- Unknown units remain null; do not infer from typical practice.
- Unknown values remain null; never replace with guessed values.
- A suffix or object number is not automatically a physical station or member ID.
- No geometry, load, or design result may be activated solely because it parses.
- Legacy values remain historical until current code basis and project conditions are re-established.
