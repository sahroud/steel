# Runway girder local nominal-stress screen

This module is a preliminary post-processing screen for the crane runway girder members already included in the 3D frame FEM.

## Workflow

1. Complete crane rail transfer and run one synchronized crane load case in the 3D frame.
2. In **غربال تنش اسمی موضعی تیر حمال**, choose **ساخت الگوی شناسه اعضا از تحلیل اخیر**.
3. For every listed member ID, enter the actual section properties and source references from the approved fabrication/section drawings.
4. Run the screen. Both local member ends are evaluated independently.

## Required input for each member ID

All geometric properties use SI units:

- `A_m2`: gross area, m²
- `Sy_m3`, `Sz_m3`: elastic section moduli about the solver's local y and z axes, m³
- `Avy_m2`, `Avz_m2`: effective shear areas for the local y and z shear components, m²
- `J_m4`: Saint-Venant torsion constant, m⁴
- `torsionRadius_m`: radius used for the simplified torsional shear estimate, m
- `Fy_MPa`: yield stress, MPa
- `source`, `geometrySource`, `shearAreaMethod`, `torsionMethod`: traceable references and methods

The JSON object is keyed by the exact member IDs from the latest 3D result. The UI can generate a blank template for these IDs.

## Equations

For each end, using absolute values of the local end actions:

```
sigma = |N|/A + |My|/Sy + |Mz|/Sz
tau   = |Vy|/Avy + |Vz|/Avz + |T| r/J
sigma_vm = sqrt(sigma² + 3 tau²)
screen ratio = sigma_vm / Fy
```

The sum of absolute components is a simplified upper-bound screen. It does not calculate the actual stress distribution through an I-shaped section. The result is an elastic nominal-stress indicator only.

## Explicit exclusions

This module does not perform code resistance design, section classification, local or lateral-torsional buckling, web crippling, patch loading, local flange bending, stiffener design, weld/bolt design, fatigue, impact/dynamic response, warping torsion, second-order analysis, or imperfection analysis. It does not use resistance factors or code load combinations. `analysisEnabled` remains false.

Do not interpret a ratio below 1.0 as proof of safety or code compliance. Validate the section properties, axis convention, shear-area method, torsion model, load combinations, and all omitted limit states independently.


## Plate geometry and stability-input audit

The same per-member JSON template includes additional fields for:
- overall depth `d_m`, flange width `bf_m`, web thickness `tw_m`, flange thickness `tf_m`
- elastic modulus `E_MPa`, yield stress `Fy_MPa`
- unbraced length `Lb_m`, `Cb`, compression-flange restraint category and its drawing source
- load height from shear center, warping constant `Cw_m6`, minor-axis inertia `Iy_minor_m4`, and `J_m4`
- bearing length, bearing/support condition, and drawing reference

The additional button **ممیزی هندسه صفحات، مهار جانبی و نشیمن** reports flange outstand-to-thickness and clear-web-depth-to-thickness ratios, normalized plate geometry ratios using `sqrt(Fy/E)`, and completeness of the stability and bearing input evidence.

It deliberately returns no code classification, lateral-torsional buckling resistance, or web-crippling resistance. Actual code limits, restraint model, load height convention, section warping data, bearing geometry and stiffener details must be verified before any resistance design can be implemented. A complete input record is not a passing design check.


## Design-basis evidence gate

A separate **مبنای آیین‌نامه‌ای تیر حمال جرثقیل** panel records the selected primary code from the controlled registry, exact edition, clause/table/figure, page or controlled-text locator, LRFD/ASD method, section form, section and geometry sources, material product standard/grade/certificate, load-combination source, compression-flange restraint drawing, and support/bracket details. An optional supplementary reference must be registered as supplementary and must include its clause and a clearly scoped purpose. A supplementary foreign specification cannot silently replace Iranian mandatory requirements.

The gate requires explicit confirmation that the official text and applicable errata have been checked. It returns only `sourceBasisComplete`; it never returns a capacity, design approval, or enables analysis. Registry matching is not legal verification of the current edition.

## Expanded local stability input audit

The plate/stability audit now rejects `none` or `unknown` compression-flange restraint states and requires positive unbraced length, `Cb`, section stability properties, bearing length, web-panel length, and explicit records for root radius, stiffener type/source, web-panel source, restraint source, and bearing detail. It still reports geometry ratios only. These added inputs are evidence collection for later code-specific checks, not resistance calculations.
