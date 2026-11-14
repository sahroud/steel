# Shahrood reference project — extraction checkpoint

Date: 2026-11-14

## Completed in this checkpoint
- Read the legacy XLSX calculation workbook and the SOOLE PARDAZ 6.1.0 SPS settings through Dropbox extraction.
- Confirmed the native M3 model exists in Dropbox and is downloadable there (229,104 bytes; Dropbox reports application/octet-stream).
- Attempted text extraction of M3. The extraction returns binary-garbled text, so it is not a usable geometry interchange format. No geometry was inferred from that output.
- Added `steel2/reference-projects/shahrood-24x60-crane30t-1396-extraction-ledger.json` with extracted settings, crane/bridge/runway data, footing legacy values, combination labels, explicit units, conflicts and fail-closed import policy.
- Re-fetched the committed JSON and parsed it successfully.

## Important extracted legacy data
- Geometry/settings: span 24,000 mm; length 60,000 mm; 11 frames; 6,000 mm frame spacing; roof slope 20%; eave 12,800 mm; ridge 15,150 mm; crane rail 9,500 mm.
- Crane type 1: rated capacity 30,000 kg; trolley mass 4,500 kg; two bridges referenced; trolley wheel spacing 1,500 mm; runway wheel spacing 3,750 mm; vertical impact 1.25; transverse/longitudinal horizontal factors 0.2.
- Runway girder legacy results: max wheel reaction with impact 26,588 kgf; max without impact 22,410 kgf; minimum without impact 6,238 kgf; transverse force 1,725 kgf; longitudinal force 2,865 kgf.
- Bridge calculation reports a plate section with flanges PL 50 x 2 cm and web PL 135 x 1.5 cm; reported major-axis inertia 1,553,610 cm4.
- Legacy fatigue basis: 50 movements/day over 30 years, 547,500 cycles.
- Legacy footing dimensions: 1,000 x 1,000 x 600 mm; reported uplift values 4,084 kgf and 7,243 kgf. These are not approved design values.

## Reconciliation items
1. Bridge mass appears as both 22.8 t and 25.28 t.
2. Multiple crane reaction families (CRANE1..CRANE10) are present; they must not be collapsed into a single generic 30 t load.
3. Exact mapping of trolley reactions, bridge/end-truck arrangement and wheel positions remains incomplete.
4. SPS contains indexed section parameters (e.g. JANeach*, hfeach*, heeach*, hmeach*, tfeach*, tweach*, wfeach*, braceeach*), but their physical station mapping and connectivity are not yet decoded.
5. M3 is binary and Dropbox text extraction is not a viable parser. Next required input is an export from SOOLE PARDAZ to IFC, DXF, SDNF, CIS/2, or a documented tabular/node-member format. A 2D DXF alone may not preserve all section stations, releases, supports and load cases.
6. Legacy load combinations and foundation calculations are comparison-only. Recalculate against the explicitly selected current Iranian code editions.

## Safety / import state
- No native 3D connectivity was reconstructed in this checkpoint.
- No solver was run against this reference project.
- No member, connection, crane, or foundation design is approved.
- Keep `designApproved=false`; unknown inputs remain null; block dependent analysis until geometry, support conditions and load vectors are reconciled.

## Repository state
- Branch: `refactor/centralized-project-state-20261112`
- Main branch was not modified.
- Latest compare to main after this checkpoint: diverged; ahead 1733, behind 6; 182 changed files in compare response.
