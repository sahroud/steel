# Legacy SPS parser contract — SAHROUD STEEL

**Version:** 1.0.1  
**Status:** read-only extraction utility; not an engineering importer.

## Purpose
Parse legacy INI-like SPS text into a traceable record set. Preserve source line,
section, key, and raw value. Detect duplicate keys and unparsed lines.

## Input
UTF-8 text containing optional section headers such as `[FRAME]`, comments
beginning with `;` or `#`, and key/value pairs separated by the first `=` or
`:` character.

## Output
- Original section and line references.
- Raw key/value records; numeric-looking values remain strings.
- Indexed-key groups based only on a trailing digit sequence.
- Warnings for duplicate keys and unparsed non-empty lines.
- Explicit fail-closed engineering flags.

## Prohibited in this version
- No unit inference or conversion.
- No interpretation of suffixes as physical stations, member IDs, or frame numbers.
- No generation of nodes, members, section schedules, or coordinates.
- No import into the structural solver.
- No approval or verification of legacy design values.

## Acceptance tests
The parser self-test checks equals/colon separators, suffix preservation,
duplicate-key detection, malformed-line detection, line provenance, and
fail-closed solver/design flags. Passing these tests verifies parser behavior
only; it is not validation of the original SPS file or of any structural design.

## Activation gate for a future importer
A separate reviewed mapping must establish, for every field used:
1. original source file and line/key (and workbook sheet/cell where applicable),
2. field meaning and dimensional unit,
3. member identity and physical coordinate/station,
4. orientation and start/end convention,
5. consistency against native software exports or independently reconstructed geometry,
6. explicit reviewer approval before solver activation.
