# Supplemental CSV tables — supports, releases, and tapered section stations

All supplemental tables are proposal-only and must reference exact IDs in a successfully parsed geometry proposal.

## Node restraints — supports.csv

Required header:
`node_id,ux,uy,uz,rx,ry,rz`

Each degree of freedom must be explicitly `FIXED` or `FREE`. This first format deliberately does not accept spring stiffnesses, partial restraints, nonlinear supports, or prescribed settlements. Omitted rows mean unspecified, not free.

## Member-end releases — releases.csv

Required header:
`member_id,end,ux,uy,uz,rx,ry,rz`

- `end`: `I` or `J`, matching the member start/end node convention.
- Each degree of freedom: `RELEASED` or `CONNECTED`.
- These labels preserve the source declaration only. They are not translated to solver flags until the source software's local-axis, sign, and release conventions have been verified.

## Tapered I-section stations — section-stations.csv

Required header:
`member_id,station_ratio,d,bf,tw,tf`

- `station_ratio`: normalized member coordinate in [0,1], measured from I to J.
- `d,bf,tw,tf`: positive I-section dimensions.
- Supply `sectionDimensionUnit` explicitly as `mm` or `m`.
- Values are normalized to metres and raw source row/unit are retained.
- The parser warns if a member's supplied stations do not include both 0 and 1.

This is a limited geometric I-section station format. It does not yet capture flange asymmetry, web taper slope, fillets, plate offsets, local-axis rotation, material grade, fabrication welds, or exact continuous taper interpolation between stations. Do not assume two stations define the actual manufactured shape without source confirmation.

## API

```js
const supplemental = SteelCSVStructuralExchange.parseSupplementalTables(
  geometryProposal,
  { supportsCsv, releasesCsv, sectionStationsCsv, sectionDimensionUnit: "mm" }
);
```

The result has `status=pending_review`, `geometryActivation=false`, `solverEligible=false`, and `designApproved=false`. Missing rows are not inferred as free, fixed, or zero. No solver model is modified.
